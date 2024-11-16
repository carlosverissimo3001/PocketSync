import { useAuthContext } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { EyeIcon, ListCheck, LogOut, MoonIcon, SunIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';

export const Navbar = () => {
  const { logout } = useAuth();
  const { isAuthenticated } = useAuthContext();
  const { isDark, toggle } = useDarkMode();

  return (
    <nav className="bg-gray-800 p-4 shadow-md">
      <div className="container mx-auto flex items-center relative">
        <div className="absolute left-1/2 -translate-x-1/2 flex gap-2">
            <Button variant="ghost" className="text-white hover:bg-gray-700">
              <ListCheck />
              <a href="/dashboard">Dashboard</a>
            </Button>

            {/* // TODO: Will open a dialog for the user to type an id
            // Will be redirected to /dashboard/:id  */}
            <Button variant="ghost" className="text-white hover:bg-gray-700">
              <EyeIcon />
              <a href="#">Check other User's Lists</a>
            </Button>
        </div>

        {/* Logout and Dark Mode Toggle Button - Right aligned */}
        {isAuthenticated && (
          <div className="ml-auto flex items-center gap-2">
            <Button 
              variant="destructive" 
              className="text-white hover:bg-gray-700"
              onClick={logout}
            >
              <LogOut />
            </Button>
            <Button variant="ghost" className="text-white hover:bg-gray-700" onClick={toggle}>
              {isDark ? <SunIcon /> : <MoonIcon />}
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;