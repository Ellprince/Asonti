import { useState, useEffect, useRef } from 'react';
import { BottomNavigation } from './components/BottomNavigation';
import { HeaderNavigation } from './components/HeaderNavigation';
import { LeftSidebar } from './components/LeftSidebar';
import { ChatScreen } from './components/ChatScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { LandingScreen } from './components/LandingScreen';
import { clearAllAppData, storage } from './components/hooks/useLocalStorage';
import { Logo } from './components/Logo';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Function to scroll to bottom smoothly
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Check registration status and apply dark mode on app load
  useEffect(() => {
    const checkRegistration = () => {
      const registrationData = storage.getItem('user-registration');
      setIsRegistered(Boolean(registrationData?.isRegistered));
      setIsLoading(false);
    };

    // Load and apply dark mode setting
    const loadDarkMode = () => {
      const savedSettings = localStorage.getItem('app-settings');
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          if (parsedSettings.darkMode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        } catch (error) {
          console.error('Error loading dark mode setting:', error);
        }
      }
    };

    checkRegistration();
    loadDarkMode();
  }, []);

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
    const handleSettingsUpdate = () => {
      const savedSettings = localStorage.getItem('app-settings');
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          if (parsedSettings.darkMode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        } catch (error) {
          console.error('Error applying dark mode:', error);
        }
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
    setIsRegistered(true);
  };

  const handleLogout = () => {
    const confirmed = window.confirm('Are you sure you want to log out? Your profile and settings will be preserved.');
    if (confirmed) {
      try {
        // Clear only the user registration data, preserve other data
        storage.removeItem('user-registration');
        setIsRegistered(false);
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

  // Show landing page if not registered
  if (!isRegistered) {
    return <LandingScreen onRegistrationComplete={handleRegistrationComplete} />;
  }

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatScreen scrollToBottom={scrollToBottom} activeTab={activeTab} />;
      case 'profile':
        return <ProfileScreen />;
      case 'settings':
        return <SettingsScreen onLogout={handleLogout} />;
      default:
        return <ChatScreen scrollToBottom={scrollToBottom} activeTab={activeTab} />;
    }
  };

  return (
    <div className="h-screen bg-background flex">
      {/* Left Sidebar - Only visible on desktop */}
      <LeftSidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col">
        
        {/* Header Navigation - Hidden on mobile and desktop, visible on tablet only */}
        <div className="hidden md:block lg:hidden">
          <HeaderNavigation 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
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
            onTabChange={setActiveTab} 
          />
        </div>
      </div>
    </div>
  );
}