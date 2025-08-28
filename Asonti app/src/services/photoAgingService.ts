import { supabase } from '@/lib/supabase';

export interface PhotoAgingResult {
  success: boolean;
  agedPhotoUrl?: string;
  error?: string;
}

class PhotoAgingService {
  private static instance: PhotoAgingService;
  
  private constructor() {}
  
  static getInstance(): PhotoAgingService {
    if (!PhotoAgingService.instance) {
      PhotoAgingService.instance = new PhotoAgingService();
    }
    return PhotoAgingService.instance;
  }

  /**
   * Age a photo using the Edge Function (which calls Replicate)
   */
  async agePhoto(photoUrl: string, profileId?: string): Promise<PhotoAgingResult> {
    try {
      console.log('Calling Edge Function to age photo...');
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('age-photo', {
        body: {
          photoUrl,
          profileId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.success && data?.agedPhotoUrl) {
        console.log('Photo aging successful:', data.agedPhotoUrl);
        return {
          success: true,
          agedPhotoUrl: data.agedPhotoUrl
        };
      } else {
        console.warn('Photo aging failed:', data?.error);
        return {
          success: false,
          error: data?.error || 'Failed to age photo'
        };
      }
    } catch (error: any) {
      console.error('Photo aging service error:', error);
      return {
        success: false,
        error: error.message || 'Failed to age photo'
      };
    }
  }

  /**
   * Check if a photo URL is from Replicate (aged photo)
   */
  isAgedPhoto(url: string): boolean {
    return url?.includes('replicate.delivery') || url?.includes('replicate.com');
  }
}

// Export singleton instance
export const photoAgingService = PhotoAgingService.getInstance();