import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Bell, Moon, HelpCircle, RotateCcw, Trash2, LogOut, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { clearAllAppData } from './hooks/useLocalStorage';

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

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('app-settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('Error loading settings from localStorage:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem('app-settings', JSON.stringify(settings));
    
    // Dispatch custom event to notify other components of settings changes
    window.dispatchEvent(new CustomEvent('app-settings-updated'));
  }, [settings]);

  const updateSetting = (key: keyof SettingsData, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetSettings = () => {
    const defaultSettings: SettingsData = {
      notifications: true,
      darkMode: false,
    };
    setSettings(defaultSettings);
    localStorage.setItem('app-settings', JSON.stringify(defaultSettings));
    
    // Dispatch custom event to notify other components of settings changes
    window.dispatchEvent(new CustomEvent('app-settings-updated'));
  };

  const handleClearAllData = () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all app data? This will delete all chat messages, settings, and future self profiles. This action cannot be undone.'
    );
    if (confirmed) {
      const success = clearAllAppData();
      if (success) {
        alert('All app data has been cleared.');
        // Reload the page to reset all components
        window.location.reload();
      } else {
        alert('There was an error clearing the data. Please try again.');
      }
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
                All data is stored locally on your device for development purposes.
              </p>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem('chat-messages');
                  }}
                  className="w-full justify-start"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Clear Chat Messages
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem('future-self-data');
                    localStorage.removeItem('future-self-wizard');
                  }}
                  className="w-full justify-start"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Clear Future Self Data
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleClearAllData}
                  className="w-full justify-start"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
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