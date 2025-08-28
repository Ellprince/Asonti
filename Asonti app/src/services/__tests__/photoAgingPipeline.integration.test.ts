import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { photoUploadService } from '../photoUploadService';
import { getReplicateService } from '../replicateService';
import { supabase } from '../../lib/supabase';

// Mock all external dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        remove: vi.fn(),
      })),
    },
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } },
        error: null,
      })),
    },
  },
}));

vi.mock('../replicateService', () => ({
  getReplicateService: vi.fn(() => ({
    agePhotoAsync: vi.fn(),
    pollPrediction: vi.fn(),
  })),
}));

describe('Photo Aging Pipeline - Integration', () => {
  let mockStorage: any;
  let mockReplicateService: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock Replicate service
    mockReplicateService = {
      agePhotoAsync: vi.fn(),
      pollPrediction: vi.fn(),
    };
    (getReplicateService as any).mockReturnValue(mockReplicateService);
    
    mockStorage = {
      upload: vi.fn().mockResolvedValue({ 
        data: { path: 'user-123/original_123.jpg' },
        error: null 
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/original.jpg' },
      }),
      remove: vi.fn().mockResolvedValue({ error: null }),
    };
    
    (supabase.storage.from as any).mockReturnValue(mockStorage);
  });
  
  test('complete flow: upload → age → save → display', async () => {
    // Setup mocks for successful flow
    const mockPredictionId = 'pred-123';
    const mockAgedUrl = 'https://replicate.com/aged.jpg';
    
    mockReplicateService.agePhotoAsync.mockResolvedValue(mockPredictionId);
    mockReplicateService.pollPrediction.mockResolvedValue(mockAgedUrl);
    
    // Mock fetch for downloading aged photo
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['aged-image-data'], { type: 'image/jpeg' })),
    });
    
    const file = new File(['test-image'], 'test.jpg', { type: 'image/jpeg' });
    
    // Test upload and aging start
    const result = await photoUploadService.uploadAndStartAging(file, 'user-123');
    
    expect(result).toHaveProperty('originalUrl');
    expect(result).toHaveProperty('predictionId');
    expect(result.originalUrl).toBe('https://storage.example.com/original.jpg');
    expect(result.predictionId).toBe(mockPredictionId);
    
    // Verify upload was called
    expect(mockStorage.upload).toHaveBeenCalledWith(
      expect.stringContaining('user-123/original_'),
      file,
      expect.objectContaining({
        cacheControl: '3600',
        upsert: false,
      })
    );
    
    // Verify aging was started
    expect(mockReplicateService.agePhotoAsync).toHaveBeenCalledWith(
      'https://storage.example.com/original.jpg'
    );
    
    // Wait for background processing
    await new Promise((resolve) => {
      photoUploadService.once('aging-complete', (data) => {
        expect(data.predictionId).toBe(mockPredictionId);
        expect(data.originalUrl).toBe('https://storage.example.com/original.jpg');
        expect(data.agedUrl).toBeDefined();
        resolve(undefined);
      });
    });
    
    // Verify status was updated
    const mockUpdate = (supabase.from as any).mock.results[0].value.update;
    expect(mockUpdate).toHaveBeenCalled();
  });
  
  test('handles network interruption during aging', async () => {
    const mockPredictionId = 'pred-456';
    
    mockReplicateService.agePhotoAsync.mockResolvedValue(mockPredictionId);
    mockReplicateService.pollPrediction.mockRejectedValue(new Error('Network error'));
    
    const file = new File(['test-image'], 'test.jpg', { type: 'image/jpeg' });
    
    const result = await photoUploadService.uploadAndStartAging(file, 'user-123');
    
    expect(result.originalUrl).toBeDefined();
    expect(result.predictionId).toBe(mockPredictionId);
    
    // Wait for background processing to fail
    await new Promise((resolve) => {
      photoUploadService.once('aging-failed', (data) => {
        expect(data.predictionId).toBe(mockPredictionId);
        expect(data.fallbackUrl).toBe(result.originalUrl);
        expect(data.error).toBeDefined();
        resolve(undefined);
      });
    });
  });
  
  test('cleans up resources on failure', async () => {
    // Simulate upload failure
    mockStorage.upload.mockRejectedValue(new Error('Upload failed'));
    
    const file = new File(['test-image'], 'test.jpg', { type: 'image/jpeg' });
    
    await expect(
      photoUploadService.uploadAndStartAging(file, 'user-123')
    ).rejects.toThrow('Failed to upload photo');
    
    // Verify no aging was attempted
    expect(mockReplicateService.agePhotoAsync).not.toHaveBeenCalled();
  });
  
  test('respects user cancellation', async () => {
    const mockPredictionId = 'pred-789';
    
    mockReplicateService.agePhotoAsync.mockResolvedValue(mockPredictionId);
    
    // Simulate cancellation by having poll return null
    mockReplicateService.pollPrediction.mockResolvedValue(null);
    
    const file = new File(['test-image'], 'test.jpg', { type: 'image/jpeg' });
    
    const result = await photoUploadService.uploadAndStartAging(file, 'user-123');
    
    // Wait for fallback
    await new Promise((resolve) => {
      photoUploadService.once('aging-failed', (data) => {
        expect(data.fallbackUrl).toBe(result.originalUrl);
        resolve(undefined);
      });
    });
  });
  
  test('works with different image formats', async () => {
    const formats = [
      { file: new File(['jpeg'], 'test.jpg', { type: 'image/jpeg' }), ext: 'jpg' },
      { file: new File(['png'], 'test.png', { type: 'image/png' }), ext: 'png' },
      { file: new File(['webp'], 'test.webp', { type: 'image/webp' }), ext: 'webp' },
    ];
    
    for (const { file, ext } of formats) {
      vi.clearAllMocks();
      
      mockReplicateService.agePhotoAsync.mockResolvedValue(`pred-${ext}`);
      
      const result = await photoUploadService.uploadAndStartAging(file, 'user-123');
      
      expect(result.originalUrl).toBeDefined();
      expect(mockStorage.upload).toHaveBeenCalledWith(
        expect.stringContaining(`.${ext}`),
        file,
        expect.any(Object)
      );
    }
  });
  
  test('handles concurrent requests', async () => {
    const files = [
      new File(['image1'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['image2'], 'test2.jpg', { type: 'image/jpeg' }),
      new File(['image3'], 'test3.jpg', { type: 'image/jpeg' }),
    ];
    
    let uploadCount = 0;
    mockStorage.upload.mockImplementation(() => {
      uploadCount++;
      return Promise.resolve({
        data: { path: `user-123/original_${uploadCount}.jpg` },
        error: null,
      });
    });
    
    mockStorage.getPublicUrl.mockImplementation((path: string) => ({
      data: { publicUrl: `https://storage.example.com/${path}` },
    }));
    
    mockReplicateService.agePhotoAsync.mockImplementation((url: string) => {
      const match = url.match(/original_(\d+)/);
      return Promise.resolve(`pred-${match?.[1] || 'unknown'}`);
    });
    
    // Start all uploads concurrently
    const promises = files.map((file) => 
      photoUploadService.uploadAndStartAging(file, 'user-123')
    );
    
    const results = await Promise.all(promises);
    
    // Verify all uploads completed
    expect(results).toHaveLength(3);
    results.forEach((result, index) => {
      expect(result.originalUrl).toContain(`original_${index + 1}`);
      expect(result.predictionId).toBe(`pred-${index + 1}`);
    });
    
    // Verify all aging processes were started
    expect(mockReplicateService.agePhotoAsync).toHaveBeenCalledTimes(3);
  });
});

describe('Photo Aging Pipeline - Error Recovery', () => {
  let mockReplicateService: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockReplicateService = {
      agePhotoAsync: vi.fn(),
      pollPrediction: vi.fn(),
    };
    (getReplicateService as any).mockReturnValue(mockReplicateService);
  });
  
  test('recovers from transient Replicate API errors', async () => {
    const mockStorage = {
      upload: vi.fn().mockResolvedValue({ 
        data: { path: 'user-123/original_123.jpg' },
        error: null 
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/original.jpg' },
      }),
    };
    
    (supabase.storage.from as any).mockReturnValue(mockStorage);
    
    // First attempt fails, second succeeds
    mockReplicateService.agePhotoAsync
      .mockRejectedValueOnce(new Error('Rate limit'))
      .mockResolvedValueOnce('pred-retry');
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    // First attempt
    await expect(
      photoUploadService.uploadAndStartAging(file, 'user-123')
    ).rejects.toThrow();
    
    // Retry should work
    const result = await photoUploadService.uploadAndStartAging(file, 'user-123');
    expect(result.predictionId).toBe('pred-retry');
  });
  
  test('provides meaningful error messages to user', async () => {
    const mockStorage = {
      upload: vi.fn().mockRejectedValue(new Error('Storage quota exceeded')),
      getPublicUrl: vi.fn(),
    };
    
    (supabase.storage.from as any).mockReturnValue(mockStorage);
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    await expect(
      photoUploadService.uploadAndStartAging(file, 'user-123')
    ).rejects.toThrow('Failed to upload photo: Storage quota exceeded');
  });
});