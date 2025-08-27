import { MessageCircle, User, Settings, LogOut, Lock, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Logo } from './Logo';

interface LeftSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  profileComplete?: boolean;
}

export function LeftSidebar({ activeTab, onTabChange, onLogout, profileComplete = true }: LeftSidebarProps) {
  const navigationItems = [
    { id: 'chat', label: 'Chat', icon: MessageCircle, requiresProfile: true },
    { id: 'profile', label: 'Profile', icon: User, requiresProfile: false },
    { id: 'settings', label: 'Settings', icon: Settings, requiresProfile: false },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:bg-sidebar lg:border-r lg:border-sidebar-border lg:h-full">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-sidebar-border md:p-6 flex-shrink-0">
        <Logo size={48} showText={true} />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isLocked = item.requiresProfile && !profileComplete;
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => onTabChange(item.id)}
                disabled={isLocked}
                className={`w-full justify-start gap-3 h-12 px-4 relative ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80'
                    : isLocked
                      ? 'text-sidebar-foreground/50 cursor-not-allowed opacity-50'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
                title={isLocked ? 'Complete your profile to unlock' : undefined}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {isLocked && (
                  <Lock className="w-4 h-4 ml-auto text-orange-500" />
                )}
              </Button>
            );
          })}
        </div>

        {/* Former Self Section - Only show if profile exists */}
        {profileComplete && (
          <div className="mt-6 pt-4 border-t border-sidebar-border">
            <h3 className="px-2 mb-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
              Archive
            </h3>
            <Button
              variant="ghost"
              onClick={() => onTabChange('former-self')}
              className={`w-full justify-start gap-3 h-12 px-4 ${
                activeTab === 'former-self'
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <Clock className="w-5 h-5" />
              <span className="font-medium">Former Self</span>
            </Button>
          </div>
        )}
      </nav>

      {/* Sidebar Footer - aligned with content Actions */}
      <div className="p-4 border-t border-sidebar-border space-y-2 flex-shrink-0">
        <div className="max-w-7xl mx-auto grid grid-cols-1 gap-2">
          <Button
            onClick={onLogout}
            variant="ghost"
            className="w-full justify-start gap-3 h-10 px-4 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Logout</span>
          </Button>
          <div className="h-9 flex items-center">
            <p className="text-xs text-sidebar-foreground/60 px-4">
              © 2024 Asonti
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}