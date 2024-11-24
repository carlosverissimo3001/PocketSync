import { Button } from '../components/ui/button';
import { ListCheck, LogOut, MoonIcon, SunIcon } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { CheckListDialog } from './list/dialogs/CheckListDialog';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuthContext } from '@/contexts/AuthContext';
import { LogoutDialog } from './auth/LogoutDialog';

export const Navbar = () => {
  const { logout } = useAuth()
  const { isAuthenticated } = useAuthContext();
  const { isDark, toggle } = useDarkMode();
  const location = useLocation();
  const isPathActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    if (path === '/dashboard/list') {
      return location.pathname.startsWith('/dashboard/list/');
    }
    return false;
  };

  return (
    <nav className="bg-gray-800 p-4 shadow-md">
      <div className="container mx-auto flex items-center relative">
        <div className="absolute left-1/2 -translate-x-1/2 flex gap-2">
            <Button 
              variant="ghost" 
              className={`text-white hover:bg-gray-700 ${
                isPathActive('/dashboard') ? 'bg-gray-700' : ''
              }`}
            >
              <ListCheck />
              <a href="/dashboard">Dashboard</a>
            </Button>

            <CheckListDialog 
              className={isPathActive('/dashboard/list') ? 'bg-gray-700' : ''}
            />
        </div>
            
        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated && (
            <LogoutDialog onLogout={logout} />
          )}
          <Button variant="ghost" className="text-white hover:bg-gray-700" onClick={toggle}>
            {isDark ? <SunIcon /> : <MoonIcon />}
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;