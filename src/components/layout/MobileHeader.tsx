import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrivacyToggle } from '@/components/PrivacyToggle';
import logo from '@/assets/logo.png';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 z-30 lg:hidden">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <img
          src={logo}
          alt="Autos da Serra"
          className="h-8 object-contain"
        />
      </div>
      <PrivacyToggle className="text-sidebar-foreground hover:bg-sidebar-accent" />
    </header>
  );
}
