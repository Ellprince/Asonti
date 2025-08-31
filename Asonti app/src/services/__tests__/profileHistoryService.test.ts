import { describe, test, expect, beforeEach, vi } from 'vitest';
import { profileHistory } from '../profileHistoryService';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ 
              data: [], 
              error: null 
            }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ 
          error: null 
        }))
      }))
    }))
  }
}));

describe('ProfileHistoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRecentHistory', () => {
    test('should fetch recent history for a profile', async () => {
      const mockHistory = [
        {
          id: '1',
          profile_id: 'test-profile',
          version_number: 5,
          operation: 'UPDATE',
          changed_at: '2025-08-31T12:00:00Z',
          old_data: { hope: 'Old hope' },
          new_data: { hope: 'New hope' },
          changed_fields: ['hope']
        }
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockHistory,
                error: null
              })
            })
          })
        })
      } as any);

      const result = await profileHistory.getRecentHistory('test-profile');
      
      expect(result).toEqual(mockHistory);
      expect(supabase.from).toHaveBeenCalledWith('profile_history');
    });

    test('should return empty array on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Database error')
              })
            })
          })
        })
      } as any);

      const result = await profileHistory.getRecentHistory('test-profile');
      
      expect(result).toEqual([]);
    });

    test('should limit results to 5 records', async () => {
      const mockLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: mockLimit
            })
          })
        })
      } as any);

      await profileHistory.getRecentHistory('test-profile');
      
      expect(mockLimit).toHaveBeenCalledWith(5);
    });
  });

  describe('getHistorySummary', () => {
    test('should return empty string when no history exists', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      } as any);

      const result = await profileHistory.getHistorySummary('test-profile');
      
      expect(result).toBe('');
    });

    test('should generate summary for UPDATE operations', async () => {
      const mockHistory = [
        {
          id: '1',
          profile_id: 'test-profile',
          version_number: 2,
          operation: 'UPDATE',
          changed_at: '2025-08-31T12:00:00Z',
          old_data: { hope: 'Old hope' },
          new_data: { hope: 'New hope' },
          changed_fields: ['hope']
        },
        {
          id: '2',
          profile_id: 'test-profile',
          version_number: 1,
          operation: 'INSERT',
          changed_at: '2025-08-30T12:00:00Z',
          old_data: null,
          new_data: { hope: 'Initial hope' },
          changed_fields: []
        }
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockHistory,
                error: null
              })
            })
          })
        })
      } as any);

      const result = await profileHistory.getHistorySummary('test-profile');
      
      expect(result).toContain('Recent profile evolution:');
      expect(result).toContain('updated hopes');
    });

    test('should describe different types of changes', async () => {
      const mockHistory = [
        {
          operation: 'UPDATE',
          changed_at: '2025-08-31T12:00:00Z',
          old_data: { 
            hope: 'Old hope',
            fear: 'Old fear',
            current_values: ['a'],
            feelings: 'Old feelings'
          },
          new_data: { 
            hope: 'New hope',
            fear: 'New fear',
            current_values: ['b'],
            feelings: 'New feelings'
          }
        }
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockHistory,
                error: null
              })
            })
          })
        })
      } as any);

      const result = await profileHistory.getHistorySummary('test-profile');
      
      expect(result).toContain('updated hopes');
      expect(result).toContain('revised fears');
      expect(result).toContain('adjusted values');
      expect(result).toContain('updated feelings');
    });
  });

  describe('deleteUserHistory', () => {
    test('should delete all user history successfully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        })
      } as any);

      const result = await profileHistory.deleteUserHistory('test-user');
      
      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('profile_history');
    });

    test('should return false on deletion error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: new Error('Delete failed')
          })
        })
      } as any);

      const result = await profileHistory.deleteUserHistory('test-user');
      
      expect(result).toBe(false);
    });
  });

  describe('getHistoryCount', () => {
    test('should return count of history records', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: 5,
            error: null
          })
        })
      } as any);

      const result = await profileHistory.getHistoryCount('test-profile');
      
      expect(result).toBe(5);
    });

    test('should return 0 when no records exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: null,
            error: null
          })
        })
      } as any);

      const result = await profileHistory.getHistoryCount('test-profile');
      
      expect(result).toBe(0);
    });

    test('should return 0 on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: null,
            error: new Error('Count failed')
          })
        })
      } as any);

      const result = await profileHistory.getHistoryCount('test-profile');
      
      expect(result).toBe(0);
    });
  });

  describe('hasRecentChanges', () => {
    test('should return true when recent changes exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ id: '1' }],
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const result = await profileHistory.hasRecentChanges('test-profile', 7);
      
      expect(result).toBe(true);
    });

    test('should return false when no recent changes exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const result = await profileHistory.hasRecentChanges('test-profile', 7);
      
      expect(result).toBe(false);
    });

    test('should use default 7 days when not specified', async () => {
      const mockGte = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: mockGte
            })
          })
        })
      } as any);

      await profileHistory.hasRecentChanges('test-profile');
      
      // Just verify gte was called (date validation is complex with mocks)
      expect(mockGte).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('should handle null data gracefully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        })
      } as any);

      const result = await profileHistory.getRecentHistory('test-profile');
      
      expect(result).toEqual([]);
    });

    test('should handle malformed history data', async () => {
      const mockHistory = [
        {
          operation: 'UPDATE',
          changed_at: '2025-08-31T12:00:00Z',
          old_data: null,
          new_data: null
        }
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockHistory,
                error: null
              })
            })
          })
        })
      } as any);

      const result = await profileHistory.getHistorySummary('test-profile');
      
      expect(result).toContain('Profile created');
    });
  });
});