import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Moon, Sun, Bell, ChevronDown, User } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  '/cosmos': 'Analytics Dashboard',
  '/cosmos/ui/buttons-group': 'Buttons Group',
  '/cosmos/ui/badges': 'Badges',
  '/cosmos/ui/alerts': 'Alerts',
  '/cosmos/ui/cards': 'Cards',
  '/cosmos/ui/carousel': 'Carousel',
  '/cosmos/ui/dropdowns': 'Dropdowns',
  '/cosmos/ui/links': 'Links',
  '/cosmos/ui/list': 'List',
  '/cosmos/ui/modals': 'Modals',
  '/cosmos/ui/notifications': 'Notifications',
  '/cosmos/ui/pagination': 'Pagination',
  '/cosmos/ui/popovers': 'Popovers',
  '/cosmos/ui/progress-bar': 'Progress Bar',
  '/cosmos/ui/ribbons': 'Ribbons',
  '/cosmos/ui/spinners': 'Spinners',
  '/cosmos/ui/tabs': 'Tabs',
  '/cosmos/ui/tooltips': 'Tooltips',
  '/cosmos/ui/breadcrumb': 'Breadcrumb',
  '/cosmos/ui/form-elements': 'Form Elements',
  '/cosmos/charts': 'Charts',
  '/cosmos/tables': 'Data Tables',
  '/cosmos/auth/signin': 'Sign In',
  '/cosmos/auth/signup': 'Sign Up',
};

interface CosmosHeaderProps {
  isDark: boolean;
  toggleDark: () => void;
}

export const CosmosHeader = ({ isDark, toggleDark }: CosmosHeaderProps) => {
  const location = useLocation();
  const [userOpen, setUserOpen] = useState(false);

  const pageTitle = ROUTE_LABELS[location.pathname] ?? 'Cosmos';

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-dark">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <button className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-error-500" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserOpen((p) => !p)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 py-1.5 pr-3 pl-2 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white">
              <User className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Admin</span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {userOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setUserOpen(false)} />
              <div className="absolute top-full right-0 z-40 mt-2 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
                <button className="w-full px-4 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5">
                  Profile
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5">
                  Settings
                </button>
                <hr className="my-1 border-gray-100 dark:border-gray-800" />
                <button className="w-full px-4 py-2 text-left text-sm text-error-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
