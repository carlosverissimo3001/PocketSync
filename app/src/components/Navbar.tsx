import { useAuthContext } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { EyeIcon, ListCheck, LogOut } from 'lucide-react';

export const Navbar = () => {
  const { isAuthenticated } = useAuthContext();

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

        {/* Logout Button - Right aligned */}
        {isAuthenticated && (
          <div className="ml-auto">
            <Button 
              variant="destructive" 
              className="text-white hover:bg-gray-700"
              onClick={logout}
            >
              <LogOut />
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;