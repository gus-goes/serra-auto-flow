import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { PrivacyToggle } from '@/components/PrivacyToggle';
import logo from '@/assets/logo.png';
import {
  LayoutDashboard,
  Car,
  Users,
  Calculator,
  FileText,
  Receipt,
  TrendingUp,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCog,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', adminOnly: false },
  { icon: Car, label: 'Veículos', path: '/veiculos', adminOnly: false },
  { icon: Users, label: 'Clientes', path: '/clientes', adminOnly: false },
  { icon: Calculator, label: 'Simulador', path: '/simulador', adminOnly: false },
  { icon: FileText, label: 'Propostas', path: '/propostas', adminOnly: false },
  { icon: Receipt, label: 'Recibos', path: '/recibos', adminOnly: false },
  { icon: TrendingUp, label: 'Funil de Vendas', path: '/funil', adminOnly: false },
  { icon: UserCog, label: 'Vendedores', path: '/vendedores', adminOnly: true },
  { icon: Settings, label: 'Configurações', path: '/configuracoes', adminOnly: true },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const filteredItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  const handleNavClick = () => {
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <aside
      className={cn(
        'fixed top-0 h-full bg-sidebar flex flex-col border-r border-sidebar-border transition-all duration-300 z-50',
        // Desktop behavior
        'hidden lg:flex',
        collapsed ? 'lg:w-16' : 'lg:w-64',
        // Mobile behavior
        mobileOpen && 'flex left-0 w-72'
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3" onClick={handleNavClick}>
          <img
            src={logo}
            alt="Autos da Serra"
            className={cn('h-10 object-contain transition-all', collapsed && 'lg:w-8')}
          />
        </Link>
        {/* Mobile close button */}
        {mobileOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileClose}
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Privacy Toggle - Desktop only */}
      <div className="hidden lg:flex px-3 py-2 border-b border-sidebar-border justify-end">
        <PrivacyToggle className="text-sidebar-foreground hover:bg-sidebar-accent" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          const linkContent = (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={cn(
                'sidebar-link',
                isActive && 'sidebar-link-active'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {(!collapsed || mobileOpen) && <span>{item.label}</span>}
            </Link>
          );

          if (collapsed && !mobileOpen) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="bg-sidebar text-sidebar-foreground border-sidebar-border">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn('flex items-center gap-3 mb-3', collapsed && !mobileOpen && 'justify-center')}>
          <div className="h-9 w-9 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-semibold flex-shrink-0">
            {user?.name.charAt(0)}
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {isAdmin ? 'Administrador' : 'Vendedor'}
              </p>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            logout();
            handleNavClick();
          }}
          className={cn(
            'w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
            collapsed && !mobileOpen && 'px-2'
          )}
        >
          <LogOut className="h-4 w-4" />
          {(!collapsed || mobileOpen) && <span className="ml-2">Sair</span>}
        </Button>
      </div>

      {/* Collapse toggle - Desktop only */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-sidebar border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hidden lg:flex"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>
    </aside>
  );
}
