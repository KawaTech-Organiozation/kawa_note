import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import ThemeToggle from './ThemeToggle';

export default function SidebarFooter({ isCollapsed = false, onToggleCollapse, isMobile = false }) {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    queryClient.clear();
    await logout();
  };

  const getUserInitials = () => {
    if (!user) return '?';
    if (user.name) {
      const names = user.name.split(' ');
      return names.length > 1
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : names[0][0].toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || '?';
  };

  const getAvatarColor = () => {
    const value = user?.email || user?.name || 'default';
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = value.charCodeAt(index) + ((hash << 5) - hash);
    }
    const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-red-500', 'bg-pink-500'];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <>
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        {isCollapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium', getAvatarColor())}>{getUserInitials()}</div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="right">
                    {user && <div className="px-2 py-1.5 text-sm"><p className="font-medium">{user.name || 'Usuário'}</p><p className="text-xs text-slate-500">{user.email}</p></div>}
                    <DropdownMenuItem onClick={handleLogout}><LogOut className="w-3 h-3 mr-2" />Sair</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent side="right"><p>{user?.name || user?.email || 'Usuário'}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0', getAvatarColor())}>{getUserInitials()}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{user?.name || 'Usuário'}</p><p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || ''}</p></div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 shrink-0 text-slate-400" title="Sair"><LogOut className="w-4 h-4" /></Button>
            </div>
            <ThemeToggle />
          </div>
        )}
      </div>

      {!isMobile && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          {isCollapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onToggleCollapse} className="w-full" title="Expandir sidebar"><PanelLeftOpen className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent side="right">Expandir sidebar</TooltipContent></Tooltip>
            </TooltipProvider>
          ) : (
            <Button variant="ghost" size="sm" onClick={onToggleCollapse} className="w-full justify-start text-slate-600 dark:text-slate-300"><PanelLeftClose className="w-4 h-4 mr-2" />Recolher</Button>
          )}
        </div>
      )}
    </>
  );
}
