import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProfileScreen } from '../ProfileScreen';
import { futureSelfService } from '@/services/futureSelfService';
import { AuthContext } from '@/contexts/AuthContext';

// Mock the service
vi.mock('@/services/futureSelfService', () => ({
  futureSelfService: {
    getActiveProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
};

const mockAuthContext = {
  user: mockUser,
  session: { user: mockUser, access_token: 'token' },
  isLoading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext as any}>
      {component}
    </AuthContext.Provider>
  );
};

describe('ProfileScreen - Database Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch profile from database on mount', async () => {
    const mockProfile = {
      id: 'profile-123',
      user_id: 'test-user-123',
      photo_url: 'https://example.com/photo.jpg',
      photo_type: 'upload',
      attributes: { kindness: 'have_now', resilience: 'want_to_develop' },
      hope: 'To become a better version of myself',
      fear: 'Staying stuck',
      current_values: ['family', 'health'],
      future_values: ['wisdom', 'impact'],
      feelings: 'Excited about the future',
      day_in_life: 'A day filled with purpose',
      is_active: true,
      version_number: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.mocked(futureSelfService.getActiveProfile).mockResolvedValue(mockProfile as any);

    renderWithAuth(<ProfileScreen />);

    // Wait for profile to load
    await waitFor(() => {
      expect(futureSelfService.getActiveProfile).toHaveBeenCalled();
    });

    // Verify profile data is displayed (adjust based on actual component)
    await waitFor(() => {
      expect(screen.getByText(/better version of myself/i)).toBeInTheDocument();
    });
  });

  it('should show loading state while fetching', async () => {
    // Create a promise we can control
    let resolveProfile: (value: any) => void;
    const profilePromise = new Promise((resolve) => {
      resolveProfile = resolve;
    });

    vi.mocked(futureSelfService.getActiveProfile).mockReturnValue(profilePromise as any);

    renderWithAuth(<ProfileScreen />);

    // Check for loading indicator
    expect(screen.getByTestId('profile-loading')).toBeInTheDocument();

    // Resolve the promise
    resolveProfile!({
      id: 'profile-123',
      user_id: 'test-user-123',
      attributes: {},
      current_values: [],
      future_values: [],
      is_active: true,
    });

    // Loading should disappear
    await waitFor(() => {
      expect(screen.queryByTestId('profile-loading')).not.toBeInTheDocument();
    });
  });

  it('should handle fetch errors', async () => {
    vi.mocked(futureSelfService.getActiveProfile).mockRejectedValue(
      new Error('Failed to fetch profile')
    );

    renderWithAuth(<ProfileScreen />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText(/error|failed|try again/i)).toBeInTheDocument();
    });
  });

  it('should update UI when profile changes', async () => {
    const initialProfile = {
      id: 'profile-123',
      user_id: 'test-user-123',
      hope: 'Initial hope',
      attributes: {},
      current_values: [],
      future_values: [],
      is_active: true,
    };

    const updatedProfile = {
      ...initialProfile,
      hope: 'Updated hope',
    };

    vi.mocked(futureSelfService.getActiveProfile).mockResolvedValue(initialProfile as any);
    vi.mocked(futureSelfService.updateProfile).mockResolvedValue(updatedProfile as any);

    const { rerender } = renderWithAuth(<ProfileScreen />);

    // Wait for initial profile to load
    await waitFor(() => {
      expect(screen.getByText(/initial hope/i)).toBeInTheDocument();
    });

    // Simulate profile update
    vi.mocked(futureSelfService.getActiveProfile).mockResolvedValue(updatedProfile as any);
    rerender(
      <AuthContext.Provider value={mockAuthContext as any}>
        <ProfileScreen />
      </AuthContext.Provider>
    );

    // Wait for updated profile to display
    await waitFor(() => {
      expect(screen.getByText(/updated hope/i)).toBeInTheDocument();
    });
  });

  it('should handle empty profile state', async () => {
    vi.mocked(futureSelfService.getActiveProfile).mockResolvedValue(null);

    renderWithAuth(<ProfileScreen />);

    // Wait for empty state
    await waitFor(() => {
      expect(screen.getByText(/no profile|create profile|get started/i)).toBeInTheDocument();
    });
  });

  it('should retry on network failure', async () => {
    let attempts = 0;
    vi.mocked(futureSelfService.getActiveProfile).mockImplementation(() => {
      attempts++;
      if (attempts < 2) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        id: 'profile-123',
        user_id: 'test-user-123',
        hope: 'Success after retry',
        attributes: {},
        current_values: [],
        future_values: [],
        is_active: true,
      } as any);
    });

    renderWithAuth(<ProfileScreen />);

    // Wait for successful retry
    await waitFor(() => {
      expect(screen.getByText(/success after retry/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(attempts).toBeGreaterThan(1);
  });
});