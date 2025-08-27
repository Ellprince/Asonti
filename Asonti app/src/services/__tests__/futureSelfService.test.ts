import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FutureSelfService } from '../futureSelfService';
import { supabase } from '@/lib/supabase';
import type { FutureSelfProfile } from '@/lib/supabase';

// Mock data
const mockUserId = 'test-user-123';
const mockProfileData: Partial<FutureSelfProfile> = {
  user_id: mockUserId,
  photo_url: 'https://example.com/photo.jpg',
  photo_type: 'upload',
  attributes: {
    'kindness': 'have_now',
    'resilience': 'want_to_develop',
    'negativity': 'not_me'
  },
  hope: 'To become a better version of myself',
  fear: 'Staying stuck in the same patterns',
  current_values: ['family', 'health', 'growth'],
  future_values: ['wisdom', 'impact', 'fulfillment'],
  feelings: 'Excited and hopeful',
  day_in_life: 'A day filled with purpose and meaning',
  is_active: true,
};

describe('FutureSelfService - Profile Creation', () => {
  let service: FutureSelfService;

  beforeEach(() => {
    service = new FutureSelfService();
    vi.clearAllMocks();
  });

  it('should create a new profile for authenticated user', async () => {
    const mockCreatedProfile = {
      ...mockProfileData,
      id: 'profile-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockCreatedProfile,
        error: null,
      }),
    } as any);

    const result = await service.createProfile(mockProfileData);
    
    expect(result).toEqual(mockCreatedProfile);
    expect(supabase.from).toHaveBeenCalledWith('future_self_profiles');
  });

  it('should reject profile creation for unauthenticated user', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await expect(service.createProfile(mockProfileData)).rejects.toThrow('User not authenticated');
  });

  it('should handle duplicate profile creation gracefully', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Duplicate profile' },
      }),
    } as any);

    await expect(service.createProfile(mockProfileData)).rejects.toThrow('Profile already exists');
  });

  it('should validate required fields before creation', async () => {
    const invalidData = { user_id: mockUserId };
    
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    await expect(service.createProfile(invalidData as any)).rejects.toThrow('Missing required fields');
  });

  it('should return created profile with ID', async () => {
    const mockCreatedProfile = {
      ...mockProfileData,
      id: 'profile-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockCreatedProfile,
        error: null,
      }),
    } as any);

    const result = await service.createProfile(mockProfileData);
    
    expect(result.id).toBeDefined();
    expect(result.id).toBe('profile-123');
  });
});

describe('FutureSelfService - Profile Updates', () => {
  let service: FutureSelfService;

  beforeEach(() => {
    service = new FutureSelfService();
    vi.clearAllMocks();
  });

  it('should update existing profile fields', async () => {
    const profileId = 'profile-123';
    const updateData = { feelings: 'More confident now' };
    const mockUpdatedProfile = {
      ...mockProfileData,
      ...updateData,
      id: profileId,
      version_number: 2,
      updated_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockUpdatedProfile,
        error: null,
      }),
    } as any);

    const result = await service.updateProfile(profileId, updateData);
    
    expect(result.feelings).toBe('More confident now');
    expect(result.version_number).toBe(2);
  });

  it('should handle partial updates', async () => {
    const profileId = 'profile-123';
    const partialUpdate = { hope: 'New hope' };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...mockProfileData, ...partialUpdate, id: profileId },
        error: null,
      }),
    } as any);

    const result = await service.updateProfile(profileId, partialUpdate);
    
    expect(result.hope).toBe('New hope');
    expect(result.fear).toBe(mockProfileData.fear);
  });

  it('should increment version on update', async () => {
    const profileId = 'profile-123';
    const updateData = { feelings: 'Updated feelings' };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    const initialProfile = {
      ...mockProfileData,
      id: profileId,
      version_number: 1,
    };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: initialProfile,
        error: null,
      }),
    } as any);

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...initialProfile, ...updateData, version_number: 2 },
        error: null,
      }),
    } as any);

    const result = await service.updateProfile(profileId, updateData);
    
    expect(result.version_number).toBeGreaterThan(1);
  });

  it('should preserve unchanged fields', async () => {
    const profileId = 'profile-123';
    const updateData = { hope: 'Updated hope' };
    const existingProfile = {
      ...mockProfileData,
      id: profileId,
      fear: 'Original fear',
      feelings: 'Original feelings',
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...existingProfile, ...updateData },
        error: null,
      }),
    } as any);

    const result = await service.updateProfile(profileId, updateData);
    
    expect(result.fear).toBe('Original fear');
    expect(result.feelings).toBe('Original feelings');
    expect(result.hope).toBe('Updated hope');
  });

  it('should reject updates to other users profiles', async () => {
    const profileId = 'other-user-profile';
    const updateData = { feelings: 'Hacked!' };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST301', message: 'Row level security violation' },
      }),
    } as any);

    await expect(service.updateProfile(profileId, updateData)).rejects.toThrow('Access denied');
  });
});

describe('FutureSelfService - Profile Retrieval', () => {
  let service: FutureSelfService;

  beforeEach(() => {
    service = new FutureSelfService();
    vi.clearAllMocks();
  });

  it('should fetch active profile for user', async () => {
    const mockProfile = {
      ...mockProfileData,
      id: 'profile-123',
      is_active: true,
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      }),
    } as any);

    const result = await service.getActiveProfile();
    
    expect(result).toEqual(mockProfile);
    expect(result?.is_active).toBe(true);
  });

  it('should return null when no profile exists', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      }),
    } as any);

    const result = await service.getActiveProfile();
    
    expect(result).toBeNull();
  });

  it('should only return own user profile', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    const mockProfile = {
      ...mockProfileData,
      id: 'profile-123',
      user_id: mockUserId,
    };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field, value) => {
        expect(field).toBe('user_id');
        expect(value).toBe(mockUserId);
        return {
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        };
      }),
    } as any);

    const result = await service.getActiveProfile();
    
    expect(result?.user_id).toBe(mockUserId);
  });

  it('should include all profile fields', async () => {
    const completeProfile = {
      id: 'profile-123',
      user_id: mockUserId,
      photo_url: 'https://example.com/photo.jpg',
      photo_type: 'upload',
      attributes: { kindness: 'have_now' },
      hope: 'Hope text',
      fear: 'Fear text',
      current_values: ['value1'],
      future_values: ['value2'],
      feelings: 'Feelings text',
      day_in_life: 'Day description',
      is_active: true,
      version_number: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: completeProfile,
        error: null,
      }),
    } as any);

    const result = await service.getActiveProfile();
    
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('photo_url');
    expect(result).toHaveProperty('attributes');
    expect(result).toHaveProperty('hope');
    expect(result).toHaveProperty('fear');
    expect(result).toHaveProperty('current_values');
    expect(result).toHaveProperty('future_values');
    expect(result).toHaveProperty('feelings');
    expect(result).toHaveProperty('day_in_life');
    expect(result).toHaveProperty('version_number');
  });
});

describe('FutureSelfService - Auto-save', () => {
  let service: FutureSelfService;

  beforeEach(() => {
    service = new FutureSelfService();
    vi.clearAllMocks();
  });

  it('should save wizard progress at each step', async () => {
    const stepData = {
      step: 1,
      data: { photo_url: 'https://example.com/photo.jpg' },
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: { id: 'profile-123', ...stepData.data },
        error: null,
      }),
    } as any);

    await service.saveWizardProgress(stepData.step, stepData.data);
    
    expect(supabase.from).toHaveBeenCalledWith('future_self_profiles');
  });

  it('should handle network failures with retry', async () => {
    const stepData = { step: 1, data: { photo_url: 'test.jpg' } };
    let attempts = 0;

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.resolve({
            data: null,
            error: { message: 'Network error' },
          });
        }
        return Promise.resolve({
          data: { id: 'profile-123' },
          error: null,
        });
      }),
    } as any);

    await service.saveWizardProgress(stepData.step, stepData.data);
    
    expect(attempts).toBe(3);
  });

  it('should queue saves when offline', async () => {
    const stepData = { step: 1, data: { photo_url: 'test.jpg' } };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    // Simulate offline
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

    await service.saveWizardProgress(stepData.step, stepData.data);
    
    expect(service.getQueuedSaves()).toHaveLength(1);
    expect(service.getQueuedSaves()[0]).toMatchObject(stepData);
  });

  it('should not lose data on rapid saves', async () => {
    // This test ensures that rapid saves don't lose data
    // In practice, Supabase handles this via upsert operations
    
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    const upsertMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const selectMock = vi.fn().mockResolvedValue({ 
      data: { id: 'profile-123' }, 
      error: null 
    });

    vi.mocked(supabase.from).mockReturnValue({
      upsert: upsertMock,
      eq: eqMock,
      select: selectMock,
    } as any);

    // Rapid saves
    const saves = [
      service.saveWizardProgress(1, { photo_url: 'photo1.jpg' }),
      service.saveWizardProgress(2, { attributes: { kindness: 'have_now' } }),
      service.saveWizardProgress(3, { hope: 'My hope' }),
    ];
    
    await Promise.all(saves);

    // All saves should complete successfully - each triggers upsert
    expect(upsertMock).toHaveBeenCalledTimes(3);
  });
});

describe('FutureSelfService - Error Handling', () => {
  let service: FutureSelfService;

  beforeEach(() => {
    service = new FutureSelfService();
    vi.clearAllMocks();
  });

  it('should handle network timeouts', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 100)
      )),
    } as any);

    await expect(service.getActiveProfile()).rejects.toThrow('Request timeout');
  });

  it('should handle invalid data gracefully', async () => {
    const invalidData = { invalid_field: 'test' };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    await expect(service.createProfile(invalidData as any)).rejects.toThrow('Missing required fields');
  });

  it('should provide meaningful error messages', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST301', message: 'Row level security policy violation' },
      }),
    } as any);

    await expect(service.getActiveProfile()).rejects.toThrow('Access denied. Check RLS policies.');
  });

  it('should implement exponential backoff for retries', async () => {
    const startTime = Date.now();
    let attempts = 0;

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.resolve({
            data: null,
            error: { message: 'Temporary failure' },
          });
        }
        return Promise.resolve({
          data: { id: 'profile-123', ...mockProfileData },
          error: null,
        });
      }),
    } as any);

    const result = await service.createProfile(mockProfileData);
    const endTime = Date.now();
    
    // Should have retried with backoff
    expect(attempts).toBe(3);
    expect(result.id).toBe('profile-123');
    // Should have delays: 0ms, 1000ms, 2000ms minimum = 3000ms total
    expect(endTime - startTime).toBeGreaterThanOrEqual(2900); // Allow slight timing variance
  });
});