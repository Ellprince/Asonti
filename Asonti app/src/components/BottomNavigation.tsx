import { HelpCircle, User, Settings, Lock } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  profileComplete?: boolean;
}

export function BottomNavigation({ activeTab, onTabChange, profileComplete = true }: BottomNavigationProps) {
  const tabs = [
    { id: 'chat', icon: HelpCircle, label: 'Chat', requiresProfile: true },
    { id: 'profile', icon: User, label: 'Profile', requiresProfile: false },
    { id: 'settings', icon: Settings, label: 'Settings', requiresProfile: false },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isLocked = tab.requiresProfile && !profileComplete;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              disabled={isLocked}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors relative ${
                activeTab === tab.id
                  ? 'text-primary bg-accent'
                  : isLocked 
                    ? 'text-muted-foreground/50 cursor-not-allowed'
                    : 'text-muted-foreground hover:text-foreground'
              }`}
              title={isLocked ? 'Complete your profile to unlock' : undefined}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {isLocked && (
                  <Lock className="w-3 h-3 absolute -top-1 -right-1 text-orange-500" />
                )}
              </div>
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}