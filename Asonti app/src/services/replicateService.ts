import { supabase } from '../lib/supabase';

interface AgeTransformationOptions {
  targetAge?: number; // Default: +2 years  
  preserveHairColor?: boolean;
  outputFormat?: 'png' | 'jpeg';
  retryOnError?: boolean;
}

interface Prediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[];
  error?: string;
}

export class ReplicateService {
  private readonly MAX_POLL_TIME = 30000; // 30 seconds
  private readonly POLL_INTERVAL = 2000; // 2 seconds
  
  constructor() {
    // No client-side token needed anymore - all calls go through the server
  }
  
  /**
   * Start aging photo asynchronously via server endpoint
   * Returns prediction ID for tracking
   */
  async agePhotoAsync(
    imageUrl: string,
    options?: AgeTransformationOptions
  ): Promise<string> {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/age-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          action: 'start',
          imageUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start aging: ${response.statusText}`);
      }

      const data = await response.json();
      return data.predictionId;
    } catch (error: any) {
      console.error('Failed to start photo aging:', error);
      throw error;
    }
  }
  
  /**
   * Poll for prediction completion via server endpoint
   * Returns aged photo URL or null if failed
   */
  async pollPrediction(
    predictionId: string,
    options?: AgeTransformationOptions
  ): Promise<string | null> {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = options?.retryOnError ? 3 : 1;
    
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      throw new Error('Authentication required');
    }
    
    while (Date.now() - startTime < this.MAX_POLL_TIME) {
      try {
        const response = await fetch('/api/age-photo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({
            action: 'poll',
            predictionId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to poll prediction: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.status === 'succeeded') {
          return data.agedUrl || null;
        }
        
        if (data.status === 'failed') {
          console.error(`Aging failed: ${data.error}`);
          return null; // Graceful fallback
        }
        
        if (data.status === 'canceled') {
          console.log('Aging was canceled');
          return null;
        }
        
        // Still processing, wait and retry
        await this.sleep(this.POLL_INTERVAL);
        
      } catch (error: any) {
        console.error('Error polling prediction:', error);
        
        if (options?.retryOnError && retryCount < maxRetries) {
          retryCount++;
          await this.sleep(this.POLL_INTERVAL);
          continue;
        }
        
        return null; // Graceful fallback on error
      }
    }
    
    // Timeout reached
    console.error('Aging timeout - took longer than 30 seconds');
    throw new Error('Aging timeout');
  }
  
  /**
   * Helper function to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  /**
   * Cancel a running prediction via server endpoint
   */
  async cancelPrediction(predictionId: string): Promise<void> {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/age-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          action: 'cancel',
          predictionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel prediction: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to cancel prediction:', error);
    }
  }
  
  /**
   * Get prediction status without polling via server endpoint
   */
  async getPredictionStatus(predictionId: string): Promise<string> {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        return 'unknown';
      }

      const response = await fetch('/api/age-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          action: 'poll',
          predictionId,
        }),
      });

      if (!response.ok) {
        return 'unknown';
      }

      const data = await response.json();
      return data.status || 'unknown';
    } catch (error) {
      console.error('Failed to get prediction status:', error);
      return 'unknown';
    }
  }
}

// Export singleton instance - no token required as we use server endpoint
let replicateServiceInstance: ReplicateService | null = null;

export const getReplicateService = () => {
  if (!replicateServiceInstance) {
    replicateServiceInstance = new ReplicateService();
  }
  return replicateServiceInstance;
};

// For backwards compatibility
export const replicateService = new ReplicateService();