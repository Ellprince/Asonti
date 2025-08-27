import { supabase, type FutureSelfProfile } from '@/lib/supabase';

export interface ProfileCompletionStatus {
  hasProfile: boolean;
  isComplete: boolean;
  missingFields: string[];
  profile?: FutureSelfProfile | null;
}

interface CachedStatus {
  status: ProfileCompletionStatus;
  timestamp: number;
}

export class ProfileGuardService {
  private static instance: ProfileGuardService;
  private profileCache = new Map<string, CachedStatus>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private listeners = new Set<(status: ProfileCompletionStatus) => void>();
  private subscription: any = null;

  private constructor() {}

  static getInstance(): ProfileGuardService {
    if (!ProfileGuardService.instance) {
      ProfileGuardService.instance = new ProfileGuardService();
    }
    return ProfileGuardService.instance;
  }

  async checkProfileCompletion(userId?: string): Promise<ProfileCompletionStatus> {
    // Get current user if not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          hasProfile: false,
          isComplete: false,
          missingFields: ['Not authenticated']
        };
      }
      userId = user.id;
    }

    // Check cache first
    const cached = this.profileCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.status;
    }

    // Query database for active profile
    const { data: profile, error } = await supabase
      .from('future_self_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !profile) {
      const status = {
        hasProfile: false,
        isComplete: false,
        missingFields: ['No profile created'],
        profile: null
      };
      this.cacheStatus(userId, status);
      return status;
    }

    // Check completion requirements
    const missingFields: string[] = [];
    
    // Check required fields
    if (!profile.attributes || Object.keys(profile.attributes).length < 24) {
      missingFields.push('attributes');
    }
    if (!profile.hope) missingFields.push('hope');
    if (!profile.fear) missingFields.push('fear');
    if (!profile.current_values || profile.current_values.length === 0) {
      missingFields.push('current_values');
    }
    if (!profile.future_values || profile.future_values.length === 0) {
      missingFields.push('future_values');
    }
    if (!profile.feelings) missingFields.push('feelings');
    if (!profile.day_in_life) missingFields.push('day_in_life');
    // Photo is optional per requirements
    
    const status = {
      hasProfile: true,
      isComplete: missingFields.length === 0,
      missingFields,
      profile
    };

    this.cacheStatus(userId, status);
    return status;
  }

  private cacheStatus(userId: string, status: ProfileCompletionStatus): void {
    this.profileCache.set(userId, {
      status,
      timestamp: Date.now()
    });
  }

  invalidateCache(userId?: string): void {
    if (userId) {
      this.profileCache.delete(userId);
    } else {
      this.profileCache.clear();
    }
  }

  canAccessChat(): boolean {
    // Synchronous check using last cached value
    const lastCheck = Array.from(this.profileCache.values()).pop();
    return lastCheck?.status.isComplete ?? false;
  }

  canAccessSettings(): boolean {
    // Settings are always accessible
    return true;
  }

  getLockedFeatures(): string[] {
    const lastCheck = Array.from(this.profileCache.values()).pop();
    if (!lastCheck?.status.isComplete) {
      return ['chat'];
    }
    return [];
  }

  async subscribeToProfileChanges(
    userId: string, 
    callback: (status: ProfileCompletionStatus) => void
  ): Promise<() => void> {
    // Add listener
    this.listeners.add(callback);

    // Subscribe to realtime changes
    this.subscription = supabase
      .channel(`profile-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'future_self_profiles',
          filter: `user_id=eq.${userId}`
        },
        async () => {
          // Invalidate cache and recheck
          this.invalidateCache(userId);
          const status = await this.checkProfileCompletion(userId);
          
          // Notify all listeners
          this.listeners.forEach(listener => listener(status));
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0 && this.subscription) {
        supabase.removeChannel(this.subscription);
        this.subscription = null;
      }
    };
  }

  async markProfileComplete(userId: string): Promise<void> {
    const { error } = await supabase
      .from('future_self_profiles')
      .update({ 
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!error) {
      this.invalidateCache(userId);
      // Trigger recheck for all listeners
      const status = await this.checkProfileCompletion(userId);
      this.listeners.forEach(listener => listener(status));
    }
  }

  async getIncompleteStep(userId: string): Promise<number> {
    const status = await this.checkProfileCompletion(userId);
    
    if (!status.profile) return 1; // Start from beginning
    
    // Map missing fields to wizard steps
    if (!status.profile.photo_url) return 1; // Photo step (optional)
    if (!status.profile.attributes || Object.keys(status.profile.attributes).length < 24) return 2;
    if (!status.profile.hope || !status.profile.fear) return 3;
    if (!status.profile.current_values?.length || !status.profile.future_values?.length) return 4;
    if (!status.profile.feelings) return 5;
    if (!status.profile.day_in_life) return 6;
    
    return 7; // Completion step
  }

  // Archive current profile and create new one
  async archiveAndStartNew(userId: string): Promise<void> {
    // Set current profile as inactive
    await supabase
      .from('future_self_profiles')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Invalidate cache
    this.invalidateCache(userId);
  }

  // Get all archived profiles (Former Selves)
  async getArchivedProfiles(userId: string): Promise<FutureSelfProfile[]> {
    const { data, error } = await supabase
      .from('future_self_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', false)
      .order('created_at', { ascending: false });

    return data || [];
  }
}

// Export singleton instance
export const profileGuard = ProfileGuardService.getInstance();