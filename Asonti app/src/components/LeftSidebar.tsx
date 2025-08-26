import { MessageCircle, User, Settings, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Logo } from './Logo';

interface LeftSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export function LeftSidebar({ activeTab, onTabChange, onLogout }: LeftSidebarProps) {
  const navigationItems = [
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
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
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => onTabChange(item.id)}
                className={`w-full justify-start gap-3 h-12 px-4 ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Button>
            );
          })}
        </div>
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