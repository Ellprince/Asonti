import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FutureSelfService } from '../futureSelfService';
import { supabase } from '@/lib/supabase';

describe('FutureSelfService - Supabase Integration', () => {
  let service: FutureSelfService;

  beforeEach(() => {
    service = new FutureSelfService();
    vi.clearAllMocks();
  });

  it('should connect to Supabase successfully', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { 
        session: { 
          user: { id: 'test-user' },
          access_token: 'valid-token',
          expires_at: Date.now() + 3600000,
        } as any 
      },
      error: null,
    });

    const session = await service.ensureSession();
    
    expect(session).toBeDefined();
    expect(session.user.id).toBe('test-user');
  });

  it('should handle auth token refresh', async () => {
    let tokenVersion = 1;
    
    vi.mocked(supabase.auth.getSession).mockImplementation(() => {
      const token = `token-v${tokenVersion}`;
      tokenVersion++;
      return Promise.resolve({
        data: {
          session: {
            user: { id: 'test-user' },
            access_token: token,
            expires_at: Date.now() + 3600000,
          } as any
        },
        error: null,
      });
    });

    const session1 = await service.ensureSession();
    const session2 = await service.ensureSession();
    
    expect(session1.access_token).not.toBe(session2.access_token);
  });

  it('should respect RLS policies', async () => {
    const mockUserId = 'user-123';
    const otherUserId = 'user-456';

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    // Trying to access another user's profile
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field, value) => {
        if (field === 'user_id' && value !== mockUserId) {
          return {
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST301', message: 'Row level security violation' },
            }),
          };
        }
        return {
          single: vi.fn().mockResolvedValue({
            data: { id: 'profile-123', user_id: mockUserId },
            error: null,
          }),
        };
      }),
    } as any);

    // Should succeed for own profile
    const ownProfile = await service.getProfileByUserId(mockUserId);
    expect(ownProfile).toBeDefined();

    // Should fail for other user's profile
    await expect(service.getProfileByUserId(otherUserId)).rejects.toThrow('Access denied');
  });

  it('should handle concurrent updates', async () => {
    const profileId = 'profile-123';
    const mockUserId = 'user-123';

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    let version = 1;
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(() => {
        const currentVersion = version++;
        return Promise.resolve({
          data: { 
            id: profileId, 
            version_number: currentVersion + 1,
            updated_at: new Date().toISOString(),
          },
          error: null,
        });
      }),
    } as any);

    // Simulate concurrent updates
    const updates = await Promise.all([
      service.updateProfile(profileId, { hope: 'Update 1' }),
      service.updateProfile(profileId, { fear: 'Update 2' }),
      service.updateProfile(profileId, { feelings: 'Update 3' }),
    ]);

    // All updates should succeed with different version numbers
    const versions = updates.map(u => u.version_number);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('should handle storage bucket operations', async () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const mockUrl = 'https://storage.supabase.co/test.jpg';

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'test-user' } } as any },
      error: null,
    });

    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        data: { path: 'test.jpg' },
        error: null,
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: mockUrl },
      }),
    } as any);

    const url = await service.uploadAvatar(file);
    
    expect(url).toBe(mockUrl);
    expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
  });

  it('should handle real-time subscription', async () => {
    const mockCallback = vi.fn();
    const mockUserId = 'user-123';

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue('subscribed'),
      unsubscribe: vi.fn(),
    };

    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

    const unsubscribe = await service.subscribeToProfileChanges(mockCallback);
    
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'future_self_profiles',
      }),
      expect.any(Function)
    );

    unsubscribe();
    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });

  it('should handle database transactions', async () => {
    const mockUserId = 'user-123';
    const profileData = {
      user_id: mockUserId,
      attributes: { kindness: 'have_now' },
      current_values: ['value1'],
      future_values: ['value2'],
      is_active: true,
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    });

    // Mock transaction-like behavior
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'future_self_profiles') {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { ...profileData, id: 'new-profile' },
            error: null,
          }),
        } as any;
      }
      return {} as any;
    });

    // Create new active profile (should deactivate others)
    const result = await service.createActiveProfile(profileData);
    
    expect(result.is_active).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('future_self_profiles');
  });

  it('should handle edge functions integration', async () => {
    const profileId = 'profile-123';
    const mockResponse = {
      personality_analysis: {
        traits: ['empathetic', 'creative'],
        growth_areas: ['confidence'],
      },
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'test-user' } } as any },
      error: null,
    });

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: mockResponse,
      error: null,
    } as any);

    const analysis = await service.generatePersonalityAnalysis(profileId);
    
    expect(analysis).toEqual(mockResponse.personality_analysis);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('analyze-personality', {
      body: { profile_id: profileId },
    });
  });
});