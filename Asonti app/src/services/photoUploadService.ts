import { EventEmitter } from 'events';
import { supabase } from '../lib/supabase';
import { getReplicateService } from './replicateService';

interface UploadResult {
  originalUrl: string;
  predictionId: string;
  agedUrl?: string;
}

interface AgingCompleteEvent {
  predictionId: string;
  originalUrl: string;
  agedUrl: string;
}

interface AgingFailedEvent {
  predictionId: string;
  originalUrl: string;
  fallbackUrl: string;
  error?: any;
}

export class PhotoUploadService extends EventEmitter {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private agingStatus = new Map<string, 'processing' | 'completed' | 'failed'>();
  
  /**
   * Upload photo and start aging process asynchronously
   */
  async uploadAndStartAging(file: File, userId: string): Promise<UploadResult> {
    // Validate file
    this.validateFile(file);
    
    // Upload original to Supabase
    const originalUrl = await this.uploadToStorage(file, userId, 'original');
    
    try {
      // Start aging process asynchronously if service is available
      const service = getReplicateService();
      if (!service) {
        console.warn('Replicate service not available, using original photo');
        return { originalUrl, predictionId: '' };
      }
      
      const predictionId = await service.agePhotoAsync(originalUrl);
      
      // Update profile with processing status
      await this.updateProfileStatus(userId, 'processing', predictionId);
      
      // Process aging in background (don't await)
      this.processAgingInBackground(predictionId, userId, originalUrl);
      
      return {
        originalUrl,
        predictionId,
      };
    } catch (error: any) {
      console.error('Failed to start aging:', error);
      // If aging fails to start, still return the original
      return {
        originalUrl,
        predictionId: '',
      };
    }
  }
  
  /**
   * Process aging in background without blocking
   */
  private async processAgingInBackground(
    predictionId: string,
    userId: string,
    originalUrl: string
  ): Promise<void> {
    this.agingStatus.set(predictionId, 'processing');
    
    try {
      // Poll for completion in background
      const service = getReplicateService();
      if (!service) {
        this.agingStatus.set(predictionId, 'failed');
        this.emit('aging-failed', {
          predictionId,
          originalUrl,
          fallbackUrl: originalUrl,
        } as AgingFailedEvent);
        return;
      }
      
      const agedUrl = await service.pollPrediction(predictionId);
      
      if (agedUrl) {
        // Download and save aged photo to Supabase
        const storedAgedUrl = await this.saveAgedPhoto(agedUrl, userId);
        this.agingStatus.set(predictionId, 'completed');
        
        // Update profile with aged photo
        await this.updateProfileWithAgedPhoto(userId, storedAgedUrl, predictionId);
        
        // Emit event for UI update
        this.emit('aging-complete', {
          predictionId,
          originalUrl,
          agedUrl: storedAgedUrl,
        } as AgingCompleteEvent);
      } else {
        // Fallback to original
        this.agingStatus.set(predictionId, 'failed');
        await this.updateProfileStatus(userId, 'failed', predictionId);
        
        this.emit('aging-failed', {
          predictionId,
          originalUrl,
          fallbackUrl: originalUrl,
        } as AgingFailedEvent);
      }
    } catch (error) {
      console.error('Background aging failed:', error);
      this.agingStatus.set(predictionId, 'failed');
      await this.updateProfileStatus(userId, 'failed', predictionId);
      
      this.emit('aging-failed', {
        predictionId,
        originalUrl,
        fallbackUrl: originalUrl,
        error,
      } as AgingFailedEvent);
    }
  }
  
  /**
   * Validate file before upload
   */
  private validateFile(file: File): void {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Invalid file type. Please upload JPEG, PNG, or WebP');
    }
    
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error('File too large. Maximum size is 5MB');
    }
  }
  
  /**
   * Upload file to Supabase Storage
   */
  private async uploadToStorage(
    file: File,
    userId: string,
    type: 'original' | 'aged'
  ): Promise<string> {
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${userId}/${type}_${timestamp}.${extension}`;
    
    const { data, error } = await supabase.storage
      .from('future-self-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (error) {
      console.error('Upload error:', error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }
    
    // Get public URL with image transformation for optimization
    const { data: urlData } = supabase.storage
      .from('future-self-photos')
      .getPublicUrl(fileName, {
        transform: {
          width: 512,
          height: 512,
          resize: 'cover',
        },
      });
    
    return urlData.publicUrl;
  }
  
  /**
   * Save aged photo from Replicate to Supabase
   */
  private async saveAgedPhoto(agedUrl: string, userId: string): Promise<string> {
    try {
      // Download aged photo from Replicate
      const response = await fetch(agedUrl);
      if (!response.ok) {
        throw new Error('Failed to download aged photo');
      }
      
      const blob = await response.blob();
      const file = new File([blob], 'aged.jpg', { type: 'image/jpeg' });
      
      // Upload to Supabase
      return await this.uploadToStorage(file, userId, 'aged');
    } catch (error) {
      console.error('Failed to save aged photo:', error);
      throw error;
    }
  }
  
  /**
   * Update profile with processing status
   */
  private async updateProfileStatus(
    userId: string,
    status: 'processing' | 'completed' | 'failed',
    predictionId?: string
  ): Promise<void> {
    const updates: any = {
      photo_aging_status: status,
      updated_at: new Date().toISOString(),
    };
    
    if (predictionId) {
      updates.replicate_prediction_id = predictionId;
    }
    
    const { error } = await supabase
      .from('future_self_profiles')
      .update(updates)
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (error) {
      console.error('Failed to update profile status:', error);
    }
  }
  
  /**
   * Update profile with aged photo URL
   */
  private async updateProfileWithAgedPhoto(
    userId: string,
    agedPhotoUrl: string,
    predictionId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('future_self_profiles')
      .update({
        aged_photo_url: agedPhotoUrl,
        photo_aging_status: 'completed',
        photo_aged_at: new Date().toISOString(),
        replicate_prediction_id: predictionId,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (error) {
      console.error('Failed to update profile with aged photo:', error);
    }
  }
  
  /**
   * Clean up failed or orphaned uploads
   */
  async cleanupFailedUpload(fileName: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from('future-self-photos')
        .remove([fileName]);
      
      if (error) {
        console.error('Failed to cleanup upload:', error);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
  
  /**
   * Get aging status for a prediction
   */
  getAgingStatus(predictionId: string): 'processing' | 'completed' | 'failed' | undefined {
    return this.agingStatus.get(predictionId);
  }
  
  /**
   * Check if aging is complete for a user
   */
  async isAgingComplete(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('future_self_profiles')
      .select('photo_aging_status')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return data.photo_aging_status === 'completed';
  }
  
  /**
   * Get aged photo URL if available
   */
  async getAgedPhotoUrl(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('future_self_profiles')
      .select('aged_photo_url, photo_url')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Return aged photo if available, otherwise original
    return data.aged_photo_url || data.photo_url || null;
  }
}

// Export singleton instance
export const photoUploadService = new PhotoUploadService();