import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Bell, Moon, HelpCircle, RotateCcw, Trash2, LogOut, Settings, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { userSettingsService, type UserSettings } from '@/services/userSettingsService';
import { useToast } from './ui/use-toast';

interface SettingsData {
  notifications: boolean;
  darkMode: boolean;
}

interface SettingsScreenProps {
  onLogout: () => void;
}

export function SettingsScreen({ onLogout }: SettingsScreenProps) {
  const [settings, setSettings] = useState<SettingsData>({
    notifications: true,
    darkMode: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load settings from Supabase on component mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const dbSettings = await userSettingsService.getOrCreateSettings();
        if (dbSettings) {
          setSettings({
            notifications: dbSettings.notifications_enabled ?? true,
            darkMode: dbSettings.dark_mode ?? false,
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast({
          title: "Error loading settings",
          description: "Using default settings",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [toast]);

  // No longer save to localStorage - handled by updateSetting function

  const updateSetting = async (key: keyof SettingsData, value: boolean) => {
    // Update local state immediately for responsive UI
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));

    // Save to Supabase
    setIsSaving(true);
    try {
      const updates: Partial<UserSettings> = {};
      if (key === 'darkMode') {
        updates.dark_mode = value;
      } else if (key === 'notifications') {
        updates.notifications_enabled = value;
      }

      await userSettingsService.updateSettings(updates);
      
      // Dispatch custom event to notify other components of settings changes
      window.dispatchEvent(new CustomEvent('app-settings-updated'));
    } catch (error) {
      console.error('Error saving setting:', error);
      // Revert on error
      setSettings(prev => ({
        ...prev,
        [key]: !value
      }));
      toast({
        title: "Error saving setting",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = async () => {
    const defaultSettings: SettingsData = {
      notifications: true,
      darkMode: false,
    };
    setSettings(defaultSettings);
    
    setIsSaving(true);
    try {
      await userSettingsService.updateSettings({
        dark_mode: false,
        notifications_enabled: true,
      });
      
      // Dispatch custom event to notify other components of settings changes
      window.dispatchEvent(new CustomEvent('app-settings-updated'));
      
      toast({
        title: "Settings reset",
        description: "Settings have been reset to defaults",
      });
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast({
        title: "Error resetting settings",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all app data? This will delete all chat messages, settings, and future self profiles. This action cannot be undone.'
    );
    if (confirmed) {
      setIsSaving(true);
      try {
        const success = await userSettingsService.clearAllUserData();
        if (success) {
          toast({
            title: "Data cleared",
            description: "All app data has been cleared",
          });
          // Reload the page to reset all components
          setTimeout(() => window.location.reload(), 1000);
        } else {
          throw new Error('Failed to clear data');
        }
      } catch (error) {
        console.error('Error clearing data:', error);
        toast({
          title: "Error clearing data",
          description: "Please try again",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleClearChatMessages = async () => {
    setIsSaving(true);
    try {
      const success = await userSettingsService.clearChatMessages();
      if (success) {
        toast({
          title: "Messages cleared",
          description: "Chat messages have been cleared",
        });
      }
    } catch (error) {
      console.error('Error clearing messages:', error);
      toast({
        title: "Error clearing messages",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearFutureSelfData = async () => {
    setIsSaving(true);
    try {
      const success = await userSettingsService.clearFutureSelfData();
      if (success) {
        toast({
          title: "Future self data cleared",
          description: "Your future self profile has been cleared",
        });
      }
    } catch (error) {
      console.error('Error clearing future self data:', error);
      toast({
        title: "Error clearing data",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border md:p-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1>Settings</h1>
            <p className="text-muted-foreground text-sm">Manage your app preferences</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6 md:p-6 lg:p-8 max-w-4xl mx-auto pb-6 md:pb-8 lg:pb-8">
          {/* Notifications */}
          <div className="space-y-4">
            <h3>Notifications</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates and reminders</p>
                </div>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(value) => updateSetting('notifications', value)}
                disabled={isLoading || isSaving}
              />
            </div>
          </div>

          <Separator />

          {/* Appearance */}
          <div className="space-y-4">
            <h3>Appearance</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Moon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Use dark theme</p>
                </div>
              </div>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(value) => updateSetting('darkMode', value)}
                disabled={isLoading || isSaving}
              />
            </div>
          </div>

          <Separator />

          {/* Help */}
          <div className="space-y-4">
            <h3>Support</h3>
            <button className="flex items-center space-x-3 w-full text-left p-2 rounded-lg hover:bg-accent transition-colors">
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label>Help & Support</Label>
                <p className="text-sm text-muted-foreground">Get help and contact support</p>
              </div>
            </button>
          </div>

          <Separator />

          {/* Account */}
          <div className="space-y-4">
            <h3>Account</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onLogout}
              className="w-full justify-start"
            >
              <LogOut className="w-3 h-3 mr-2" />
              Log Out
            </Button>
          </div>

          {/* Data Management */}
          <Separator />
          
          <div className="space-y-4">
            <h3>Data Management</h3>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Your data is securely stored in the cloud.
              </p>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearChatMessages}
                  className="w-full justify-start"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3 mr-2" />
                  )}
                  Clear Chat Messages
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearFutureSelfData}
                  className="w-full justify-start"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3 mr-2" />
                  )}
                  Clear Future Self Data
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleClearAllData}
                  className="w-full justify-start"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3 mr-2" />
                  )}
                  Clear All App Data
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}