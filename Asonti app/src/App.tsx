import { useState, useEffect, useRef } from 'react';
import { BottomNavigation } from './components/BottomNavigation';
import { HeaderNavigation } from './components/HeaderNavigation';
import { LeftSidebar } from './components/LeftSidebar';
import { ChatScreen } from './components/ChatScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { LandingScreen } from './components/LandingScreen-supabase';
import { FormerSelfScreen } from './components/FormerSelfScreen';
import { clearAllAppData, storage } from './components/hooks/useLocalStorage';
import { Logo } from './components/Logo';
import { useAuth } from './contexts/AuthContext';
import { profileMigration } from './utils/profileMigration';
import { profileGuard } from './services/profileGuard';
import { ToastProvider } from './components/ui/use-toast';
import type { ProfileCompletionStatus } from './services/profileGuard';
import { userSettingsService } from './services/userSettingsService';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [isLoading, setIsLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [showOnboardingMessage, setShowOnboardingMessage] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { user, loading: authLoading, signOut } = useAuth();

  // Function to scroll to bottom smoothly
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Check auth status and apply dark mode on app load
  useEffect(() => {
    // Load and apply dark mode setting from Supabase
    const loadDarkMode = async () => {
      try {
        const settings = await userSettingsService.getOrCreateSettings();
        if (settings) {
          if (settings.dark_mode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      } catch (error) {
        console.error('Error loading dark mode setting:', error);
        // Default to light mode if error
        document.documentElement.classList.remove('dark');
      }
    };

    loadDarkMode();
  }, [user]); // Re-run when user changes

  // Update loading state when auth loading completes
  useEffect(() => {
    if (!authLoading) {
      setIsLoading(false);
    }
  }, [authLoading]);

  // Check profile completion status + subscribe for realtime updates
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const run = async () => {
      if (!user?.id) {
        setCheckingProfile(false);
        setProfileComplete(false);
        return;
      }

      setCheckingProfile(true);
      const status = await profileGuard.checkProfileCompletion(user.id);
      setProfileComplete(status.isComplete);
      setCheckingProfile(false);

      if (!status.isComplete) {
        setActiveTab('profile');
        setShowOnboardingMessage(true);
      }

      // Subscribe to realtime profile changes
      unsubscribe = await profileGuard.subscribeToProfileChanges(
        user.id,
        (newStatus: ProfileCompletionStatus) => {
          setProfileComplete(newStatus.isComplete);
          if (newStatus.isComplete) {
            setShowOnboardingMessage(false);
          }
        }
      );
    };

    run();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id]);

  // Run migration when user logs in
  useEffect(() => {
    const runMigration = async () => {
      if (!user) return;
      
      try {
        const needsMigration = await profileMigration.isMigrationNeeded();
        if (needsMigration) {
          console.log('Starting profile migration...');
          const success = await profileMigration.migrateLocalStorageToSupabase();
          if (success) {
            console.log('Profile migration completed successfully');
            // Optionally clean up after successful migration
            // profileMigration.cleanupLocalStorage();
          } else {
            console.warn('Profile migration failed, will retry on next login');
          }
        }
      } catch (error) {
        console.error('Error during migration:', error);
      }
    };

    runMigration();
  }, [user]);

  // Listen for settings changes to update dark mode
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app-settings' && e.newValue) {
        try {
          const parsedSettings = JSON.parse(e.newValue);
          if (parsedSettings.darkMode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        } catch (error) {
          console.error('Error applying dark mode from storage change:', error);
        }
      }
    };

    // Listen for direct localStorage changes (in case multiple tabs)
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events for same-tab updates
    const handleSettingsUpdate = async () => {
      try {
        const settings = await userSettingsService.getOrCreateSettings();
        if (settings) {
          if (settings.dark_mode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      } catch (error) {
        console.error('Error applying dark mode:', error);
      }
    };

    // Custom event for same-tab settings updates
    window.addEventListener('app-settings-updated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('app-settings-updated', handleSettingsUpdate);
    };
  }, []);

  // Add keyboard shortcut to clear all data (Ctrl+Shift+Delete or Cmd+Shift+Delete)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Delete') {
        event.preventDefault();
        const confirmed = window.confirm(
          'Are you sure you want to clear all app data? This will delete all chat messages, settings, future self profiles, and registration data.'
        );
        if (confirmed) {
          const success = clearAllAppData();
          if (success) {
            // Reset registration state and reload
            setIsRegistered(false);
            window.location.reload();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRegistrationComplete = () => {
    // Auth state will automatically update via AuthContext
    // No need to manually set registration state
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (confirmed) {
      try {
        const { error } = await signOut();
        if (error) throw error;
        setActiveTab('chat'); // Reset to chat tab for next login
      } catch (error) {
        console.error('Error during logout:', error);
        alert('There was an error logging out. Please try again.');
      }
    }
  };

  // Show loading state briefly
  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <Logo size={64} showText={false} />
          </div>
          <p className="text-muted-foreground text-sm">Loading ASONTI AI...</p>
        </div>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!user) {
    return (
      <ToastProvider>
        <LandingScreen onRegistrationComplete={handleRegistrationComplete} />
      </ToastProvider>
    );
  }

  const handleTabChange = (newTab: string) => {
    // Prevent navigation to chat if profile is incomplete
    if (newTab === 'chat' && !profileComplete) {
      alert('Please complete your Future Self profile first to start chatting.');
      setActiveTab('profile');
      setShowOnboardingMessage(true);
      return;
    }
    setActiveTab(newTab);
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatScreen scrollToBottom={scrollToBottom} activeTab={activeTab} />;
      case 'profile':
        return <ProfileScreen showOnboarding={showOnboardingMessage} />;
      case 'settings':
        return <SettingsScreen onLogout={handleLogout} />;
      case 'former-self':
        return <FormerSelfScreen />;
      default:
        return <ChatScreen scrollToBottom={scrollToBottom} activeTab={activeTab} />;
    }
  };

  return (
    <ToastProvider>
      <div className="h-screen bg-background flex">
        {/* Left Sidebar - Only visible on desktop */}
        <LeftSidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          onLogout={handleLogout}
          profileComplete={profileComplete}
        />

        {/* Main App Container */}
        <div className="flex-1 flex flex-col">
          
          {/* Header Navigation - Hidden on mobile and desktop, visible on tablet only */}
          <div className="hidden md:block lg:hidden">
            <HeaderNavigation 
              activeTab={activeTab} 
              onTabChange={handleTabChange}
              profileComplete={profileComplete}
            />
          </div>

          {/* Main content area */}
          <div 
            ref={scrollContainerRef}
            className={`flex-1 overflow-x-hidden ${
              activeTab === 'chat' ? 'pb-0 md:pb-0 lg:pb-0 lg:overflow-hidden' : 'pb-20 md:pb-0 lg:pb-0 overflow-y-auto'
            }`}
          >
            <div className="h-full">
              <div className="h-full">
                {renderActiveScreen()}
              </div>
            </div>
          </div>
          
          {/* Bottom navigation - Only visible on mobile */}
          <div className="md:hidden">
            <BottomNavigation 
              activeTab={activeTab} 
              onTabChange={handleTabChange}
              profileComplete={profileComplete}
            />
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
