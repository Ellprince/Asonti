import { supabase } from '@/lib/supabase';
import type { FutureSelfProfile, Database } from '@/lib/supabase';
import type { Session, RealtimeChannel } from '@supabase/supabase-js';

export interface WizardStepData {
  photo_url?: string;
  photo_type?: 'upload' | 'simulated' | 'default';
  attributes?: Record<string, 'have_now' | 'want_to_develop' | 'not_me'>;
  hope?: string;
  fear?: string;
  current_values?: string[];
  future_values?: string[];
  feelings?: string;
  day_in_life?: string;
}

interface QueuedSave {
  step: number;
  data: WizardStepData;
  timestamp: number;
}

export class FutureSelfService {
  private saveQueue: QueuedSave[] = [];
  private retryDelays = [1000, 2000, 4000]; // Exponential backoff delays

  /**
   * Ensures user is authenticated and returns session
   */
  async ensureSession(): Promise<Session> {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      throw new Error(`Authentication error: ${error.message}`);
    }
    
    if (!session) {
      throw new Error('User not authenticated');
    }
    
    return session;
  }

  /**
   * Handles Supabase errors with RLS awareness
   */
  private handleError(error: any): never {
    // Check for RLS policy violations first (99% of errors)
    if (error?.code === 'PGRST301') {
      throw new Error('Access denied. Check RLS policies.');
    }
    
    if (error?.code === '23505') {
      throw new Error('Profile already exists');
    }
    
    if (error?.code === 'PGRST116') {
      // No rows found - return null instead of throwing
      return null as never;
    }
    
    throw new Error(error?.message || 'Database operation failed');
  }

  /**
   * Validates profile data has required fields
   */
  private validateProfileData(data: Partial<FutureSelfProfile>): void {
    const requiredFields = ['attributes', 'current_values', 'future_values'];
    const missingFields = requiredFields.filter(field => !(field in data));
    
    if (missingFields.length > 0 && !data.id) {
      throw new Error('Missing required fields');
    }
  }

  /**
   * Retries a function with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries - 1) {
          const delay = this.retryDelays[attempt] || 4000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Creates a new future self profile
   */
  async createProfile(data: Partial<FutureSelfProfile>): Promise<FutureSelfProfile> {
    const session = await this.ensureSession();
    this.validateProfileData(data);
    
    const profileData = {
      ...data,
      user_id: session.user.id,
      is_active: true,
      version_number: 1,
    };
    
    return this.retryWithBackoff(async () => {
      const { data: profile, error } = await supabase
        .from('future_self_profiles')
        .insert(profileData)
        .select()
        .single();
      
      if (error) {
        this.handleError(error);
      }
      
      return profile!;
    });
  }

  /**
   * Updates an existing profile
   */
  async updateProfile(
    id: string,
    data: Partial<FutureSelfProfile>
  ): Promise<FutureSelfProfile> {
    const session = await this.ensureSession();
    
    // Get current version for increment
    const { data: currentProfile } = await supabase
      .from('future_self_profiles')
      .select('version_number')
      .eq('id', id)
      .single();
    
    const updateData = {
      ...data,
      version_number: (currentProfile?.version_number || 0) + 1,
      updated_at: new Date().toISOString(),
    };
    
    const { data: profile, error } = await supabase
      .from('future_self_profiles')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', session.user.id) // Ensure user owns the profile
      .select()
      .single();
    
    if (error) {
      this.handleError(error);
    }
    
    return profile!;
  }

  /**
   * Gets the active profile for the current user
   */
  async getActiveProfile(): Promise<FutureSelfProfile | null> {
    const session = await this.ensureSession();
    
    const { data: profile, error } = await supabase
      .from('future_self_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No profile found
      }
      this.handleError(error);
    }
    
    return profile;
  }

  /**
   * Gets profile by user ID (for testing RLS)
   */
  async getProfileByUserId(userId: string): Promise<FutureSelfProfile | null> {
    await this.ensureSession();
    
    const { data: profile, error } = await supabase
      .from('future_self_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      this.handleError(error);
    }
    
    return profile;
  }

  /**
   * Saves wizard progress with auto-retry and queueing
   */
  async saveWizardProgress(step: number, data: WizardStepData): Promise<void> {
    // Check if offline
    if (!navigator.onLine) {
      this.queueSave(step, data);
      return;
    }
    
    const session = await this.ensureSession();
    
    // Try to save with retry
    await this.retryWithBackoff(async () => {
      const { error } = await supabase
        .from('future_self_profiles')
        .upsert({
          user_id: session.user.id,
          ...data,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id)
        .select();
      
      if (error) {
        throw error;
      }
    });
  }

  /**
   * Queues a save for when connection is restored
   */
  private queueSave(step: number, data: WizardStepData): void {
    this.saveQueue.push({
      step,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Gets queued saves (for testing)
   */
  getQueuedSaves(): QueuedSave[] {
    return this.saveQueue;
  }

  /**
   * Processes queued saves when back online
   */
  async processQueuedSaves(): Promise<void> {
    if (!navigator.onLine || this.saveQueue.length === 0) {
      return;
    }
    
    const queue = [...this.saveQueue];
    this.saveQueue = [];
    
    for (const save of queue) {
      try {
        await this.saveWizardProgress(save.step, save.data);
      } catch (error) {
        // Re-queue failed saves
        this.saveQueue.push(save);
        throw error;
      }
    }
  }

  /**
   * Uploads avatar image with optimization
   */
  async uploadAvatar(file: File): Promise<string> {
    const session = await this.ensureSession();
    const fileName = `${session.user.id}/${Date.now()}-${file.name}`;
    
    // Use resumable upload for files > 6MB
    const isLargeFile = file.size > 6 * 1024 * 1024;
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (error) {
      throw new Error(`Avatar upload failed: ${error.message}`);
    }
    
    // Get public URL with transformation
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(data.path);
    
    return urlData.publicUrl;
  }

  /**
   * Creates an active profile (deactivates others)
   */
  async createActiveProfile(
    data: Partial<FutureSelfProfile>
  ): Promise<FutureSelfProfile> {
    const session = await this.ensureSession();
    
    // Deactivate existing profiles
    await supabase
      .from('future_self_profiles')
      .update({ is_active: false })
      .eq('user_id', session.user.id)
      .neq('id', '');
    
    // Create new active profile
    return this.createProfile({
      ...data,
      is_active: true,
    });
  }

  /**
   * Subscribes to real-time profile changes
   */
  async subscribeToProfileChanges(
    callback: (profile: FutureSelfProfile) => void
  ): Promise<() => void> {
    const session = await this.ensureSession();
    
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'future_self_profiles',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          callback(payload.new as FutureSelfProfile);
        }
      );
    
    await channel.subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }

  /**
   * Generates personality analysis via edge function
   */
  async generatePersonalityAnalysis(profileId: string): Promise<any> {
    await this.ensureSession();
    
    const { data, error } = await supabase.functions.invoke('analyze-personality', {
      body: { profile_id: profileId },
    });
    
    if (error) {
      throw new Error(`Analysis failed: ${error.message}`);
    }
    
    return data.personality_analysis;
  }

  /**
   * Gets or creates a profile for the current user
   */
  async getOrCreateProfile(): Promise<FutureSelfProfile> {
    const existingProfile = await this.getActiveProfile();
    
    if (existingProfile) {
      return existingProfile;
    }
    
    // Create a new profile with defaults
    return this.createProfile({
      attributes: {},
      current_values: [],
      future_values: [],
      is_active: true,
    });
  }

  /**
   * Completes the wizard and marks profile as complete
   */
  async completeWizard(profileId: string): Promise<FutureSelfProfile> {
    return this.updateProfile(profileId, {
      completed_at: new Date().toISOString(),
    });
  }
}

// Export singleton instance
export const futureSelfService = new FutureSelfService();