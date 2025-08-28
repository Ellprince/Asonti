import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { PhotoUploadService } from '../photoUploadService';
import { supabase } from '../../lib/supabase';
import { getReplicateService } from '../replicateService';

// Mock dependencies
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
      update: vi.fn(),
      select: vi.fn(),
    })),
  },
}));

vi.mock('../replicateService', () => ({
  getReplicateService: vi.fn(),
}));

describe('PhotoUploadService - Upload Flow', () => {
  let service: PhotoUploadService;
  let mockStorage: any;
  let mockReplicate: any;
  
  beforeEach(() => {
    service = new PhotoUploadService();
    
    mockStorage = {
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
    };
    
    (supabase.storage.from as any).mockReturnValue(mockStorage);
    
    mockReplicate = {
      agePhotoAsync: vi.fn(),
      pollPrediction: vi.fn(),
    };
    
    (getReplicateService as any).mockReturnValue(mockReplicate);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  test('should validate image file type', async () => {
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    
    await expect(
      service.uploadAndStartAging(invalidFile, 'user-123')
    ).rejects.toThrow('Invalid file type');
  });
  
  test('should enforce size limit (5MB)', async () => {
    const largeFile = new File(
      [new ArrayBuffer(6 * 1024 * 1024)],
      'large.jpg',
      { type: 'image/jpeg' }
    );
    
    await expect(
      service.uploadAndStartAging(largeFile, 'user-123')
    ).rejects.toThrow('File too large');
  });
  
  test('should resize large images', async () => {
    // Mock successful upload
    mockStorage.upload.mockResolvedValue({ data: { path: 'path/to/image.jpg' } });
    mockStorage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/image.jpg' },
    });
    mockReplicate.agePhotoAsync.mockResolvedValue('pred-123');
    
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const result = await service.uploadAndStartAging(file, 'user-123');
    
    // Verify resize parameters in getPublicUrl
    expect(mockStorage.getPublicUrl).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        transform: {
          width: 512,
          height: 512,
          resize: 'cover',
        },
      })
    );
  });
  
  test('should upload to Supabase Storage', async () => {
    mockStorage.upload.mockResolvedValue({ data: { path: 'path/to/image.jpg' } });
    mockStorage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/image.jpg' },
    });
    mockReplicate.agePhotoAsync.mockResolvedValue('pred-123');
    
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const result = await service.uploadAndStartAging(file, 'user-123');
    
    expect(mockStorage.upload).toHaveBeenCalledWith(
      expect.stringContaining('user-123/original_'),
      file,
      expect.objectContaining({
        cacheControl: '3600',
        upsert: false,
      })
    );
  });
  
  test('should generate public URL', async () => {
    mockStorage.upload.mockResolvedValue({ data: { path: 'path/to/image.jpg' } });
    mockStorage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/image.jpg' },
    });
    mockReplicate.agePhotoAsync.mockResolvedValue('pred-123');
    
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const result = await service.uploadAndStartAging(file, 'user-123');
    
    expect(result.originalUrl).toBe('https://example.com/image.jpg');
    expect(mockStorage.getPublicUrl).toHaveBeenCalled();
  });
  
  test('should handle upload failures', async () => {
    mockStorage.upload.mockRejectedValue(new Error('Upload failed'));
    
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    
    await expect(
      service.uploadAndStartAging(file, 'user-123')
    ).rejects.toThrow('Upload failed');
  });
});

describe('PhotoUploadService - Async Processing', () => {
  let service: PhotoUploadService;
  let mockStorage: any;
  let mockReplicate: any;
  
  beforeEach(() => {
    service = new PhotoUploadService();
    
    mockStorage = {
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
    };
    
    (supabase.storage.from as any).mockReturnValue(mockStorage);
    
    mockReplicate = {
      agePhotoAsync: vi.fn(),
      pollPrediction: vi.fn(),
    };
    
    (getReplicateService as any).mockReturnValue(mockReplicate);
  });
  
  test('should trigger aging asynchronously', async () => {
    mockStorage.upload.mockResolvedValue({ data: { path: 'path/to/image.jpg' } });
    mockStorage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/image.jpg' },
    });
    mockReplicate.agePhotoAsync.mockResolvedValue('pred-123');
    
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const result = await service.uploadAndStartAging(file, 'user-123');
    
    expect(mockReplicate.agePhotoAsync).toHaveBeenCalledWith(
      'https://example.com/image.jpg'
    );
    expect(result.predictionId).toBe('pred-123');
  });
  
  test('should return original URL immediately', async () => {
    mockStorage.upload.mockResolvedValue({ data: { path: 'path/to/image.jpg' } });
    mockStorage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/image.jpg' },
    });
    mockReplicate.agePhotoAsync.mockResolvedValue('pred-123');
    
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const result = await service.uploadAndStartAging(file, 'user-123');
    
    expect(result.originalUrl).toBe('https://example.com/image.jpg');
    // Should not wait for aging to complete
    expect(result.agedUrl).toBeUndefined();
  });
  
  test('should emit event when aging completes', async (done) => {
    mockStorage.upload.mockResolvedValue({ data: { path: 'path/to/image.jpg' } });
    mockStorage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/image.jpg' },
    });
    mockReplicate.agePhotoAsync.mockResolvedValue('pred-123');
    mockReplicate.pollPrediction.mockResolvedValue('https://example.com/aged.jpg');
    
    service.on('aging-complete', (data) => {
      expect(data).toEqual({
        predictionId: 'pred-123',
        originalUrl: 'https://example.com/image.jpg',
        agedUrl: expect.stringContaining('aged'),
      });
      done();
    });
    
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    await service.uploadAndStartAging(file, 'user-123');
  });
  
  test('should save aged URL when available', async () => {
    mockStorage.upload.mockResolvedValue({ data: { path: 'path/to/image.jpg' } });
    mockStorage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/image.jpg' },
    });
    mockReplicate.agePhotoAsync.mockResolvedValue('pred-123');
    mockReplicate.pollPrediction.mockResolvedValue('https://example.com/aged.jpg');
    
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    
    (supabase.from as any).mockReturnValue({ update: mockUpdate });
    
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    await service.uploadAndStartAging(file, 'user-123');
    
    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        aged_photo_url: expect.any(String),
        photo_aging_status: 'completed',
      })
    );
  });
  
  test('should fallback to original on aging failure', async (done) => {
    mockStorage.upload.mockResolvedValue({ data: { path: 'path/to/image.jpg' } });
    mockStorage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/image.jpg' },
    });
    mockReplicate.agePhotoAsync.mockResolvedValue('pred-123');
    mockReplicate.pollPrediction.mockResolvedValue(null); // Aging failed
    
    service.on('aging-failed', (data) => {
      expect(data).toEqual({
        predictionId: 'pred-123',
        originalUrl: 'https://example.com/image.jpg',
        fallbackUrl: 'https://example.com/image.jpg',
      });
      done();
    });
    
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    await service.uploadAndStartAging(file, 'user-123');
  });
  
  test('should not block wizard progression', async () => {
    mockStorage.upload.mockResolvedValue({ data: { path: 'path/to/image.jpg' } });
    mockStorage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/image.jpg' },
    });
    mockReplicate.agePhotoAsync.mockResolvedValue('pred-123');
    
    // Simulate slow aging process
    mockReplicate.pollPrediction.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve('aged.jpg'), 5000))
    );
    
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    
    const start = Date.now();
    const result = await service.uploadAndStartAging(file, 'user-123');
    const duration = Date.now() - start;
    
    // Should return quickly without waiting for aging
    expect(duration).toBeLessThan(1000);
    expect(result.originalUrl).toBeDefined();
    expect(result.predictionId).toBeDefined();
  });
});