import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Moon, Sun, Bell, ChevronDown, User, Search, X } from 'lucide-react';

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
  '/cosmos/ui/avatars': 'Avatars',
  '/cosmos/charts': 'Charts',
  '/cosmos/tables': 'Data Tables',
  '/cosmos/profile': 'Profile',
  '/cosmos/calendar': 'Calendar',
  '/cosmos/auth/signin': 'Sign In',
  '/cosmos/auth/signup': 'Sign Up',
};

const NOTIFICATIONS = [
  { id: 1, name: 'Alex Johnson', action: 'commented on your post', time: '5 min ago', unread: true },
  { id: 2, name: 'Sarah Williams', action: 'sent you a friend request', time: '12 min ago', unread: true },
  { id: 3, name: 'Michael Chen', action: 'shared a file with you', time: '1h ago', unread: true },
  { id: 4, name: 'Emily Davis', action: 'mentioned you in a comment', time: '2h ago', unread: false },
  { id: 5, name: 'James Wilson', action: 'reacted to your photo', time: '3h ago', unread: false },
];

interface CosmosHeaderProps {
  isDark: boolean;
  toggleDark: () => void;
}

export const CosmosHeader = ({ isDark, toggleDark }: CosmosHeaderProps) => {
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const pageTitle = ROUTE_LABELS[location.pathname] ?? 'Cosmos';
  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-dark">
      {/* Left: page title */}
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-white">{pageTitle}</h1>
      </div>

      {/* Center: search */}
      <div className="mx-6 hidden flex-1 max-w-md lg:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-4 pl-10 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:border-brand-500 dark:focus:bg-gray-800"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen((p) => !p); setUserOpen(false); }}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 flex h-2 w-2 items-center justify-center rounded-full bg-error-500" />
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
              <div className="absolute top-full right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-500 dark:bg-brand-500/15">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
                  {NOTIFICATIONS.map((n) => (
                    <div key={n.id} className={`flex gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${n.unread ? 'bg-brand-25 dark:bg-brand-500/5' : ''}`}>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-500 dark:bg-brand-500/15">
                        {n.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-semibold text-gray-900 dark:text-white">{n.name}</span>{' '}
                          {n.action}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">{n.time}</p>
                      </div>
                      {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 p-2 dark:border-gray-800">
                  <button className="w-full rounded-lg py-2 text-center text-sm font-medium text-brand-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                    View all notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => { setUserOpen((p) => !p); setNotifOpen(false); }}
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
              <div className="absolute top-full right-0 z-40 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
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
