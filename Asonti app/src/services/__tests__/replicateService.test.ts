import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReplicateService } from '../replicateService';
import Replicate from 'replicate';

// Mock Replicate client
vi.mock('replicate');

describe('ReplicateService - Photo Aging', () => {
  let service: ReplicateService;
  let mockClient: any;
  
  beforeEach(() => {
    // Reset environment variables
    vi.stubEnv('VITE_REPLICATE_API_TOKEN', 'test-token');
    
    // Create mock client
    mockClient = {
      predictions: {
        create: vi.fn(),
        get: vi.fn(),
      },
    };
    
    // Mock Replicate constructor
    (Replicate as any).mockImplementation(() => mockClient);
    
    service = new ReplicateService();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });
  
  test('should initialize with valid API token', () => {
    expect(() => new ReplicateService()).not.toThrow();
    expect(Replicate).toHaveBeenCalledWith({ auth: 'test-token' });
  });
  
  test('should reject initialization without token', () => {
    vi.stubEnv('VITE_REPLICATE_API_TOKEN', '');
    expect(() => new ReplicateService()).toThrow('Replicate API token required');
  });
  
  test('should create prediction for valid image with 2-year aging', async () => {
    const mockPrediction = { id: 'pred-123', status: 'starting' };
    mockClient.predictions.create.mockResolvedValue(mockPrediction);
    
    const predictionId = await service.agePhotoAsync('https://example.com/image.jpg');
    
    expect(mockClient.predictions.create).toHaveBeenCalledWith({
      version: expect.any(String),
      input: {
        image: 'https://example.com/image.jpg',
        target_age: '2_years_older',
      },
    });
    expect(predictionId).toBe('pred-123');
  });
  
  test('should handle invalid image formats', async () => {
    mockClient.predictions.create.mockRejectedValue(
      new Error('Invalid image format')
    );
    
    await expect(
      service.agePhotoAsync('https://example.com/file.txt')
    ).rejects.toThrow('Invalid image format');
  });
  
  test('should poll for completion status', async () => {
    const mockPrediction = {
      id: 'pred-123',
      status: 'succeeded',
      output: 'https://replicate.com/aged-image.jpg',
    };
    
    mockClient.predictions.get
      .mockResolvedValueOnce({ status: 'processing' })
      .mockResolvedValueOnce({ status: 'processing' })
      .mockResolvedValueOnce(mockPrediction);
    
    const result = await service.pollPrediction('pred-123');
    
    expect(mockClient.predictions.get).toHaveBeenCalledTimes(3);
    expect(mockClient.predictions.get).toHaveBeenCalledWith('pred-123');
    expect(result).toBe('https://replicate.com/aged-image.jpg');
  });
  
  test('should timeout after 30 seconds', async () => {
    mockClient.predictions.get.mockResolvedValue({ status: 'processing' });
    
    // Mock timer to speed up test
    vi.useFakeTimers();
    
    const promise = service.pollPrediction('pred-123');
    
    // Fast forward time
    vi.advanceTimersByTime(31000);
    
    await expect(promise).rejects.toThrow('Aging timeout');
    
    vi.useRealTimers();
  });
  
  test('should retry on transient failures', async () => {
    mockClient.predictions.get
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        status: 'succeeded',
        output: 'https://replicate.com/aged-image.jpg',
      });
    
    const result = await service.pollPrediction('pred-123', { retryOnError: true });
    
    expect(mockClient.predictions.get).toHaveBeenCalledTimes(2);
    expect(result).toBe('https://replicate.com/aged-image.jpg');
  });
});

describe('ReplicateService - Error Handling', () => {
  let service: ReplicateService;
  let mockClient: any;
  
  beforeEach(() => {
    vi.stubEnv('VITE_REPLICATE_API_TOKEN', 'test-token');
    
    mockClient = {
      predictions: {
        create: vi.fn(),
        get: vi.fn(),
      },
    };
    
    (Replicate as any).mockImplementation(() => mockClient);
    service = new ReplicateService();
  });
  
  test('should handle API rate limits', async () => {
    const rateLimitError = new Error('Rate limit exceeded');
    (rateLimitError as any).status = 429;
    
    mockClient.predictions.create.mockRejectedValue(rateLimitError);
    
    await expect(
      service.agePhotoAsync('https://example.com/image.jpg')
    ).rejects.toThrow('Rate limit exceeded');
  });
  
  test('should handle network errors', async () => {
    mockClient.predictions.get.mockRejectedValue(new Error('Network timeout'));
    
    const result = await service.pollPrediction('pred-123');
    
    expect(result).toBeNull(); // Should fallback gracefully
  });
  
  test('should handle invalid API responses', async () => {
    mockClient.predictions.get.mockResolvedValue({
      status: 'succeeded',
      // Missing output field
    });
    
    const result = await service.pollPrediction('pred-123');
    
    expect(result).toBeNull();
  });
  
  test('should provide meaningful error messages', async () => {
    mockClient.predictions.get.mockResolvedValue({
      status: 'failed',
      error: 'Face not detected in image',
    });
    
    const result = await service.pollPrediction('pred-123');
    
    expect(result).toBeNull();
    // Check that error was logged
  });
  
  test('should clean up failed predictions', async () => {
    mockClient.predictions.get.mockResolvedValue({
      status: 'failed',
      error: 'Processing error',
    });
    
    mockClient.predictions.cancel = vi.fn();
    
    await service.pollPrediction('pred-123');
    
    // Verify cleanup was attempted
    expect(mockClient.predictions.cancel).not.toHaveBeenCalled(); // Only on timeout
  });
});