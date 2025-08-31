/**
 * Retry utility with exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  onRetry: () => {},
};

/**
 * Executes a function with exponential backoff retry logic
 * @param fn The async function to retry
 * @param options Retry configuration options
 * @returns Promise with the result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (attempt === config.maxRetries - 1) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.initialDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
      );
      
      // Call retry callback
      config.onRetry(attempt + 1, lastError);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

/**
 * Checks if an error is retryable
 * @param error The error to check
 * @returns true if the error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error?.message?.includes('Failed to fetch')) {
    return true;
  }
  
  // Supabase rate limiting
  if (error?.code === '429' || error?.status === 429) {
    return true;
  }
  
  // Temporary database issues
  if (error?.code === 'PGRST301' || error?.code === '503') {
    return true;
  }
  
  // Connection errors
  if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
    return true;
  }
  
  // Default to not retryable for other errors
  return false;
}

/**
 * Wraps a Supabase operation with retry logic
 * @param operation The Supabase operation to retry
 * @param options Retry configuration options
 * @returns Promise with the result of the operation
 */
export async function retrySupabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithBackoff(async () => {
    const { data, error } = await operation();
    
    if (error) {
      // Only retry if the error is retryable
      if (isRetryableError(error)) {
        throw error;
      }
      // Non-retryable errors should fail immediately
      throw new Error(error.message || 'Operation failed');
    }
    
    if (!data) {
      throw new Error('No data returned from operation');
    }
    
    return data;
  }, options);
}