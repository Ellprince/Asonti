import { useState } from 'react';
import { Menu, X, MessageCircle, User, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from './ui/sheet';
import { Logo } from './Logo';

interface HeaderNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function HeaderNavigation({ activeTab, onTabChange }: HeaderNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigationItems = [
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setIsMenuOpen(false);
  };

  const getActiveTabLabel = () => {
    const activeItem = navigationItems.find(item => item.id === activeTab);
    return activeItem?.label || 'ASONTI AI';
  };

  return (
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
      <div className="p-4 md:p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={48} showText={true} />
          <div>
            <p className="text-xs text-muted-foreground">{getActiveTabLabel()}</p>
          </div>
        </div>

        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:flex lg:hidden lg:p-4">
              <Menu className="w-5 h-5 lg:w-10 lg:h-10" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>
                <Logo size={32} showText={true} />
              </SheetTitle>
              <SheetDescription>
                Navigate between different sections of the app
              </SheetDescription>
            </SheetHeader>
            
            <nav className="mt-8">
              <div className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="mt-8 pt-8 border-t border-border">
              <p className="text-xs text-muted-foreground px-4">
                Navigate between sections
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}