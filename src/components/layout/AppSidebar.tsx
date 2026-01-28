import { Coffee, LayoutDashboard, MapPin, Settings, LogOut, User } from 'lucide-react';
import { NavLink, useLocation, Link, useNavigate } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, role, signOut } = useAuth();
  const { t } = useLanguage();
  const collapsed = state === 'collapsed';

  const menuItems = [
    { title: t('sidebar.dashboard'), url: '/dashboard', icon: LayoutDashboard },
    { title: t('sidebar.cafelist'), url: '/cafes', icon: MapPin },
    { title: t('sidebar.settings'), url: '/settings', icon: Settings },
  ];

  const roleLabels = {
    admin: t('sidebar.role.admin'),
    store_manager: t('sidebar.role.store_manager'),
    user: t('sidebar.role.user'),
  };


  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img
            src="/logo-white.png"
            alt="CafeIn Logo"
            className="h-14 w-14 object-contain sidebar-logo"
          />
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground">{t('app.title')}</span>
          )}
        </div>
      </SidebarHeader>

      <Separator className="bg-sidebar-border" />

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url ||
                  (item.url !== '/dashboard' && location.pathname.startsWith(item.url));

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <NavLink to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Separator className="mb-4 bg-sidebar-border" />

        <div onClick={() => navigate('/profile')}>
          <div className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <Avatar className="h-10 w-10 border-2 border-sidebar-accent">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>

            {!collapsed && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-sm font-medium text-sidebar-foreground">
                  {profile?.full_name || 'User'}
                </span>
                <Badge
                  variant="secondary"
                  className="mt-1 w-fit text-xs"
                >
                  {roleLabels[role]}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {!collapsed && (
          <Button
            variant="ghost"
            className="mt-4 w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5" />
            <span>{t('sidebar.logout')}</span>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
