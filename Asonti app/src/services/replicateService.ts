import Replicate from 'replicate';

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
  private client: Replicate;
  private readonly MAX_POLL_TIME = 30000; // 30 seconds
  private readonly POLL_INTERVAL = 2000; // 2 seconds
  private readonly SAM_MODEL_VERSION = 'd7129e88816823363aa5b41ed9aab6b9cb2996ce742c4169379cca5c40812b1f';
  
  constructor() {
    const token = import.meta.env.VITE_REPLICATE_API_TOKEN;
    if (!token) {
      throw new Error('Replicate API token required');
    }
    
    this.client = new Replicate({ auth: token });
  }
  
  /**
   * Start aging photo asynchronously
   * Returns prediction ID for tracking
   */
  async agePhotoAsync(
    imageUrl: string,
    options?: AgeTransformationOptions
  ): Promise<string> {
    try {
      const prediction = await this.createPrediction(imageUrl, options);
      return prediction.id;
    } catch (error: any) {
      console.error('Failed to start photo aging:', error);
      throw error;
    }
  }
  
  /**
   * Poll for prediction completion
   * Returns aged photo URL or null if failed
   */
  async pollPrediction(
    predictionId: string,
    options?: AgeTransformationOptions
  ): Promise<string | null> {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = options?.retryOnError ? 3 : 1;
    
    while (Date.now() - startTime < this.MAX_POLL_TIME) {
      try {
        const prediction = await this.client.predictions.get(predictionId);
        
        if (prediction.status === 'succeeded') {
          // Handle both string and array outputs
          const output = Array.isArray(prediction.output) 
            ? prediction.output[0] 
            : prediction.output;
          return output || null;
        }
        
        if (prediction.status === 'failed') {
          console.error(`Aging failed: ${prediction.error}`);
          return null; // Graceful fallback
        }
        
        if (prediction.status === 'canceled') {
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
   * Create prediction with SAM model
   */
  private async createPrediction(
    imageUrl: string,
    options?: AgeTransformationOptions
  ): Promise<Prediction> {
    // Note: SAM model expects specific input format
    // For subtle 2-year aging, we may need to adjust parameters
    const input = {
      image: imageUrl,
      target_age: options?.targetAge || '2_years_older',
      // Additional parameters may be needed based on model documentation
    };
    
    const prediction = await this.client.predictions.create({
      version: this.SAM_MODEL_VERSION,
      input,
    });
    
    return prediction as Prediction;
  }
  
  /**
   * Helper function to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  /**
   * Cancel a running prediction
   */
  async cancelPrediction(predictionId: string): Promise<void> {
    try {
      await this.client.predictions.cancel(predictionId);
    } catch (error) {
      console.error('Failed to cancel prediction:', error);
    }
  }
  
  /**
   * Get prediction status without polling
   */
  async getPredictionStatus(predictionId: string): Promise<string> {
    try {
      const prediction = await this.client.predictions.get(predictionId);
      return prediction.status;
    } catch (error) {
      console.error('Failed to get prediction status:', error);
      return 'unknown';
    }
  }
}

// Export singleton instance only if token exists
let replicateServiceInstance: ReplicateService | null = null;

export const getReplicateService = () => {
  if (!replicateServiceInstance) {
    try {
      replicateServiceInstance = new ReplicateService();
    } catch (error) {
      console.warn('Replicate service not available:', error);
      return null;
    }
  }
  return replicateServiceInstance;
};

// For backwards compatibility and testing
export const replicateService = (() => {
  try {
    return import.meta.env.VITE_REPLICATE_API_TOKEN ? new ReplicateService() : null;
  } catch {
    return null;
  }
})();