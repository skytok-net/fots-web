import { Link } from '@remix-run/react';
import { useAuth } from '~/hooks/use-auth';
import { useTheme } from '~/hooks/use-theme';
import { Avatar, AvatarImage, AvatarFallback } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Sun, Moon } from 'lucide-react';

export function Header() {
  const { isAuthenticated, logout, user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <header className="bg-background border-b border-border shadow-sm w-full">
      <nav className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src={isDarkMode ? "/logo-light.png" : "/logo-dark.png"} 
                alt="Food on the Stove" 
                className="h-8"
              />
            </Link>
            {/* Navigation items will be loaded from GraphQL */}
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
            {!isAuthenticated ? (
              <>
                <Link
                  to="/register"
                  className="text-secondary hover:text-secondary/80 dark:text-secondary-foreground dark:hover:text-secondary-foreground/80"
                >
                  Register
                </Link>
                <Link
                  to="/login"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
                >
                  Login
                </Link>
              </>
            ) : (
              <div className="relative group">
                <Avatar className={user?.avatar ? "" : "bg-primary"}>
                  <AvatarImage src={user?.avatar} alt={user?.displayName || ""} />
                  <AvatarFallback>{user?.displayName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="absolute right-0 mt-2 w-48 bg-card text-card-foreground rounded-lg shadow-lg py-2 hidden group-hover:block z-50 border border-border">
                  <Link
                    to="/profile"
                    className="block px-4 py-2 hover:bg-accent hover:text-accent-foreground"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="block px-4 py-2 hover:bg-accent hover:text-accent-foreground"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={logout}
                    className="block w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
