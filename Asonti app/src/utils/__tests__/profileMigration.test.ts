import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileMigration } from '../profileMigration';
import { futureSelfService } from '@/services/futureSelfService';
import { storage } from '@/components/hooks/useLocalStorage';

// Mock dependencies
vi.mock('@/services/futureSelfService', () => ({
  futureSelfService: {
    getActiveProfile: vi.fn(),
    createProfile: vi.fn(),
  },
}));

vi.mock('@/components/hooks/useLocalStorage', () => ({
  storage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('Profile Migration', () => {
  let migration: ProfileMigration;
  
  beforeEach(() => {
    migration = new ProfileMigration();
    vi.clearAllMocks();
  });

  it('should migrate valid localStorage data', async () => {
    const legacyData = {
      hasProfile: true,
      createdAt: '2024-01-01T00:00:00Z',
      photo: 'https://example.com/photo.jpg',
      attributes: { kindness: 'have_now', resilience: 'want_to_develop' },
      hope: 'To become better',
      fear: 'Staying stuck',
      currentValues: ['family', 'health'],
      futureValues: ['wisdom', 'impact'],
      feelings: 'Excited',
      dayInLife: 'A productive day',
    };

    vi.mocked(futureSelfService.getActiveProfile).mockResolvedValue(null);
    vi.mocked(storage.getItem).mockImplementation((key) => {
      if (key === 'future-self-data') return legacyData;
      return null;
    });
    vi.mocked(futureSelfService.createProfile).mockResolvedValue({
      id: 'new-profile-123',
    } as any);

    const result = await migration.migrateLocalStorageToSupabase();
    
    expect(result).toBe(true);
    expect(futureSelfService.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        photo_url: 'https://example.com/photo.jpg',
        photo_type: 'upload',
        attributes: { kindness: 'have_now', resilience: 'want_to_develop' },
        hope: 'To become better',
        fear: 'Staying stuck',
        current_values: ['family', 'health'],
        future_values: ['wisdom', 'impact'],
        feelings: 'Excited',
        day_in_life: 'A productive day',
        is_active: true,
      })
    );
  });

  it('should handle missing localStorage data', async () => {
    vi.mocked(futureSelfService.getActiveProfile).mockResolvedValue(null);
    vi.mocked(storage.getItem).mockReturnValue(null);

    const result = await migration.migrateLocalStorageToSupabase();
    
    expect(result).toBe(true);
    expect(futureSelfService.createProfile).not.toHaveBeenCalled();
  });

  it('should validate data before migration', async () => {
    const invalidData = {
      hasProfile: true,
      // Missing required fields
    };

    vi.mocked(futureSelfService.getActiveProfile).mockResolvedValue(null);
    vi.mocked(storage.getItem).mockImplementation((key) => {
      if (key === 'future-self-data') return invalidData;
      return null;
    });

    const result = await migration.migrateLocalStorageToSupabase();
    
    expect(result).toBe(false);
    expect(futureSelfService.createProfile).not.toHaveBeenCalled();
  });

  it('should not duplicate existing profiles', async () => {
    const existingProfile = {
      id: 'existing-profile-123',
      user_id: 'user-123',
      is_active: true,
    };

    vi.mocked(futureSelfService.getActiveProfile).mockResolvedValue(existingProfile as any);

    const result = await migration.migrateLocalStorageToSupabase();
    
    expect(result).toBe(true);
    expect(futureSelfService.createProfile).not.toHaveBeenCalled();
  });

  it('should prefer wizard data over profile data', async () => {
    const profileData = {
      hasProfile: true,
      hope: 'Old hope',
      attributes: { kindness: 'not_me' },
      currentValues: ['old'],
      futureValues: ['old'],
    };

    const wizardData = {
      hope: 'New hope',
      attributes: { kindness: 'have_now' },
      currentValues: ['new'],
      futureValues: ['new'],
      currentStep: 3,
      completed: false,
    };

    vi.mocked(futureSelfService.getActiveProfile).mockResolvedValue(null);
    vi.mocked(storage.getItem).mockImplementation((key) => {
      if (key === 'future-self-data') return profileData;
      if (key === 'future-self-wizard') return wizardData;
      return null;
    });
    vi.mocked(futureSelfService.createProfile).mockResolvedValue({
      id: 'new-profile-123',
    } as any);

    const result = await migration.migrateLocalStorageToSupabase();
    
    expect(result).toBe(true);
    expect(futureSelfService.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        hope: 'New hope',
        attributes: { kindness: 'have_now' },
        current_values: ['new'],
        future_values: ['new'],
      })
    );
  });

  it('should mark migration as complete', async () => {
    const legacyData = {
      hasProfile: true,
      attributes: {},
      currentValues: [],
      futureValues: [],
    };

    vi.mocked(futureSelfService.getActiveProfile).mockResolvedValue(null);
    vi.mocked(storage.getItem).mockImplementation((key) => {
      if (key === 'future-self-data') return legacyData;
      return null;
    });
    vi.mocked(futureSelfService.createProfile).mockResolvedValue({
      id: 'new-profile-123',
    } as any);

    const result = await migration.migrateLocalStorageToSupabase();
    
    expect(result).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      'migration-completed',
      expect.objectContaining({
        success: true,
        timestamp: expect.any(String),
      })
    );
  });

  it('should check if migration is needed', async () => {
    const legacyData = {
      hasProfile: true,
      attributes: {},
      currentValues: [],
      futureValues: [],
    };

    vi.mocked(storage.getItem).mockImplementation((key) => {
      if (key === 'future-self-data') return legacyData;
      return null;
    });

    const needed = await migration.isMigrationNeeded();
    
    expect(needed).toBe(true);
  });

  it('should not migrate if already completed', async () => {
    vi.mocked(storage.getItem).mockImplementation((key) => {
      if (key === 'migration-completed') {
        return { success: true, timestamp: '2024-01-01' };
      }
      return null;
    });

    const needed = await migration.isMigrationNeeded();
    
    expect(needed).toBe(false);
  });

  it('should cleanup localStorage after migration', () => {
    const migrationStatus = { success: true, timestamp: '2024-01-01' };
    
    vi.mocked(storage.getItem).mockReturnValue(migrationStatus);

    migration.cleanupLocalStorage();
    
    expect(storage.removeItem).toHaveBeenCalledWith('future-self-data');
    expect(storage.removeItem).toHaveBeenCalledWith('future-self-wizard');
    expect(storage.setItem).toHaveBeenCalledWith('migration-completed', migrationStatus);
  });

  it('should determine photo type correctly', async () => {
    const testCases = [
      { photo: 'simulated-avatar:🌟:gradient', expectedType: 'simulated' },
      { photo: 'https://example.com/photo.jpg', expectedType: 'upload' },
      { photo: 'data:image/png;base64,abc', expectedType: 'upload' },
      { photo: undefined, expectedType: 'default' },
    ];

    for (const testCase of testCases) {
      const legacyData = {
        hasProfile: true,
        photo: testCase.photo,
        attributes: {},
        currentValues: [],
        futureValues: [],
      };

      vi.mocked(futureSelfService.getActiveProfile).mockResolvedValue(null);
      vi.mocked(storage.getItem).mockImplementation((key) => {
        if (key === 'future-self-data') return legacyData;
        return null;
      });
      vi.mocked(futureSelfService.createProfile).mockResolvedValue({
        id: 'new-profile-123',
      } as any);

      await migration.migrateLocalStorageToSupabase();
      
      expect(futureSelfService.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          photo_type: testCase.expectedType,
        })
      );

      vi.clearAllMocks();
    }
  });
});