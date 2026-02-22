import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Moon,
  Sun,
  Bell,
  ChevronDown,
  User,
  Search,
  X,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import type { ActiveAlert } from '../../types';

const ROUTE_LABELS: Record<string, string> = {
  '/cosmos': 'Analytics Dashboard',
  '/cosmos/views/worldmap': 'World Map',
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
  '/cosmos/notifications': 'Notifications',
  '/cosmos/auth/signin': 'Sign In',
  '/cosmos/auth/signup': 'Sign Up',
};

const SEV_COLOR: Record<string, string> = {
  CRIT: '#ef4444',
  WARN: '#f59e0b',
};

interface CosmosHeaderProps {
  isDark: boolean;
  toggleDark: () => void;
}

export const CosmosHeader = ({ isDark, toggleDark }: CosmosHeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [seenCount, setSeenCount] = useState(0);

  // Load real alerts from API, poll every 30s
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await api.getActiveAlerts();
        if (active) setAlerts(data?.alerts ?? []);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const pageTitle = ROUTE_LABELS[location.pathname] ?? 'Cosmos';
  const critCount = alerts.filter((a) => a.state === 'CRIT').length;
  const warnCount = alerts.filter((a) => a.state === 'WARN').length;
  const unreadCount = Math.max(0, alerts.length - seenCount);

  const handleOpenNotif = () => {
    setNotifOpen((p) => !p);
    setUserOpen(false);
    setSeenCount(alerts.length);
  };

  return (
    <header className="dark:bg-gray-dark flex h-[72px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800">
      {/* Left: page title */}
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
          {pageTitle}
        </h1>
      </div>

      {/* Center: search */}
      <div className="mx-6 hidden max-w-md flex-1 lg:block">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="focus:border-brand-500 dark:focus:border-brand-500 h-10 w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-4 pl-10 text-sm text-gray-700 placeholder:text-gray-400 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:bg-gray-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
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
            onClick={handleOpenNotif}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
              <div className="shadow-theme-xl absolute top-full right-0 z-40 mt-2 w-96 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Active Alerts
                  </h3>
                  <div className="flex items-center gap-2">
                    {critCount > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600 dark:bg-red-500/15 dark:text-red-400">
                        <XCircle className="h-3 w-3" />
                        {critCount} CRIT
                      </span>
                    )}
                    {warnCount > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        {warnCount} WARN
                      </span>
                    )}
                  </div>
                </div>

                {/* Alert list */}
                <div className="max-h-96 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
                  {alerts.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                      <Bell className="h-8 w-8 text-gray-300 dark:text-gray-700" />
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        No active alerts
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-600">
                        All nodes are healthy
                      </p>
                    </div>
                  ) : (
                    alerts.slice(0, 15).map((alert, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setNotifOpen(false);
                          navigate(`/cosmos/views/rack/${alert.rack_id}`);
                        }}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                      >
                        {/* Severity icon */}
                        <div
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${SEV_COLOR[alert.state] ?? '#6b7280'}20` }}
                        >
                          {alert.state === 'CRIT' ? (
                            <XCircle
                              className="h-4 w-4"
                              style={{ color: SEV_COLOR[alert.state] }}
                            />
                          ) : (
                            <AlertTriangle
                              className="h-4 w-4"
                              style={{ color: SEV_COLOR[alert.state] }}
                            />
                          )}
                        </div>
                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {alert.node_id}
                          </p>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {alert.rack_name} · {alert.room_name}
                          </p>
                          {alert.checks.length > 0 && (
                            <p className="mt-0.5 truncate font-mono text-[10px] text-gray-400">
                              {alert.checks[0].id}
                              {alert.checks.length > 1 ? ` +${alert.checks.length - 1}` : ''}
                            </p>
                          )}
                        </div>
                        {/* State badge */}
                        <span
                          className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                          style={{ backgroundColor: SEV_COLOR[alert.state] ?? '#6b7280' }}
                        >
                          {alert.state}
                        </span>
                      </button>
                    ))
                  )}
                  {alerts.length > 15 && (
                    <div className="px-4 py-2 text-center text-xs text-gray-400">
                      +{alerts.length - 15} more alerts
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 p-2 dark:border-gray-800">
                  <button
                    onClick={() => {
                      setNotifOpen(false);
                      navigate('/cosmos/slurm/alerts');
                    }}
                    className="text-brand-500 w-full rounded-lg py-2 text-center text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    View all alerts →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => {
              setUserOpen((p) => !p);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-gray-200 py-1.5 pr-3 pl-2 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
          >
            <div className="bg-brand-500 flex h-7 w-7 items-center justify-center rounded-full text-white">
              <User className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Admin</span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {userOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setUserOpen(false)} />
              <div className="shadow-theme-lg absolute top-full right-0 z-40 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 dark:border-gray-800 dark:bg-gray-900">
                <button className="w-full px-4 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5">
                  Profile
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5">
                  Settings
                </button>
                <hr className="my-1 border-gray-100 dark:border-gray-800" />
                <button className="text-error-500 w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
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
