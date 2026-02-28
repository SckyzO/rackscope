import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Moon,
  Sun,
  Bell,
  ChevronDown,
  AlertTriangle,
  XCircle,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import type { ActiveAlert } from '../../types';
import { AppSearch } from './AppSearch';
import { useAuth } from '../../contexts/AuthContext';
import { useAvatar } from '../../hooks/useAvatar';
import { usePageTitleValue } from '../contexts/PageTitleContext';
import { usePlaylistSafe } from '../contexts/PlaylistContext';
import { PlaylistCountdownCircle } from '../components/PlaylistCountdown';

const ROUTE_LABELS: Record<string, string> = {
  '/cosmos': 'Analytics Dashboard',
  '/views/worldmap': 'World Map',
  '/ui/buttons-group': 'Buttons Group',
  '/ui/badges': 'Badges',
  '/ui/alerts': 'Alerts',
  '/ui/cards': 'Cards',
  '/ui/carousel': 'Carousel',
  '/ui/dropdowns': 'Dropdowns',
  '/ui/links': 'Links',
  '/ui/list': 'List',
  '/ui/modals': 'Modals',
  '/ui/notifications': 'Notifications',
  '/ui/pagination': 'Pagination',
  '/ui/popovers': 'Popovers',
  '/ui/progress-bar': 'Progress Bar',
  '/ui/ribbons': 'Ribbons',
  '/ui/spinners': 'Spinners',
  '/ui/tabs': 'Tabs',
  '/ui/tooltips': 'Tooltips',
  '/ui/breadcrumb': 'Breadcrumb',
  '/ui/form-elements': 'Form Elements',
  '/ui/avatars': 'Avatars',
  '/charts': 'Charts',
  '/tables': 'Data Tables',
  '/profile': 'Profile',
  '/calendar': 'Calendar',
  '/notifications': 'Notifications',
  '/auth/signin': 'Sign In',
  '/auth/signup': 'Sign Up',
};

const SEV_COLOR: Record<string, string> = {
  CRIT: '#ef4444',
  WARN: '#f59e0b',
};

interface AppHeaderProps {
  isDark: boolean;
  toggleDark: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const AppHeader = ({
  isDark,
  toggleDark,
  sidebarCollapsed,
  onToggleSidebar,
}: AppHeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, authEnabled } = useAuth();
  const { avatar } = useAvatar();
  const displayName = authEnabled && user ? user.username : 'Admin';
  const initial = displayName.charAt(0).toUpperCase();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  // Refs for fixed dropdown positioning (escapes overflow:hidden parents + Leaflet stacking context)
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const userBtnRef = useRef<HTMLDivElement>(null);
  const [notifPos, setNotifPos] = useState({ top: 0, right: 0 });
  const [userPos, setUserPos] = useState({ top: 0, right: 0 });

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

  // Dynamic title set by pages via usePageTitle(); falls back to static ROUTE_LABELS map.
  const contextTitle = usePageTitleValue();
  const pageTitle = contextTitle || ROUTE_LABELS[location.pathname] || '';
  const playlist = usePlaylistSafe();
  const critCount = alerts.filter((a) => a.state === 'CRIT').length;
  const warnCount = alerts.filter((a) => a.state === 'WARN').length;

  const handleOpenNotif = () => {
    if (!notifOpen && notifBtnRef.current) {
      const r = notifBtnRef.current.getBoundingClientRect();
      setNotifPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setNotifOpen((p) => !p);
    setUserOpen(false);
  };

  const handleOpenUser = () => {
    if (!userOpen && userBtnRef.current) {
      const r = userBtnRef.current.getBoundingClientRect();
      setUserPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setUserOpen((p) => !p);
    setNotifOpen(false);
  };

  return (
    <header className="dark:bg-gray-dark relative z-30 flex h-[72px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 [transition:background-color_500ms_ease,border-color_500ms_ease] dark:border-gray-800">
      {/* Left: sidebar toggle + page title */}
      <div className="flex min-w-0 items-center gap-3">
        {/* Sidebar toggle — TailAdmin asymmetric hamburger */}
        <button
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
        >
          <svg
            className="fill-current"
            width="16"
            height="12"
            viewBox="0 0 16 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
            />
          </svg>
        </button>
        <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
          {pageTitle}
        </h1>
      </div>

      {/* Center: search */}
      <AppSearch />

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Playlist controls — visible only when features.playlist = true and queue has items */}
        {playlist.enabled && playlist.queue.length > 0 && (
          <>
            {/* Main control strip */}
            <div
              className={`flex items-center overflow-hidden rounded-xl border transition-colors ${
                playlist.isPlaying
                  ? 'border-brand-400 bg-brand-50 dark:border-brand-700/50 dark:bg-brand-500/10'
                  : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              {/* Prev button — shows title when playing */}
              <button
                onClick={playlist.prev}
                title="Previous view"
                className="flex h-10 items-center justify-center gap-1.5 px-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <SkipBack className="h-3.5 w-3.5 shrink-0" />
                {playlist.isPlaying &&
                  playlist.queue.length > 1 &&
                  (() => {
                    const prevIdx =
                      (playlist.currentIndex - 1 + playlist.queue.length) % playlist.queue.length;
                    const prevTitle = playlist.queue[prevIdx]?.title;
                    return prevTitle ? (
                      <span className="max-w-[80px] truncate text-xs">{prevTitle}</span>
                    ) : null;
                  })()}
              </button>

              {/* Countdown circle — shows elapsed time as shrinking arc */}
              {playlist.isPlaying && <PlaylistCountdownCircle />}

              {/* Play / Pause */}
              <button
                onClick={playlist.toggle}
                title={playlist.isPlaying ? 'Pause playlist' : 'Start playlist'}
                className={`flex h-10 w-10 shrink-0 items-center justify-center transition-colors ${
                  playlist.isPlaying
                    ? 'text-brand-500 hover:bg-brand-100 dark:hover:bg-brand-500/20'
                    : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
                }`}
              >
                {playlist.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>

              {/* Dot position indicators (max 8; otherwise counter) */}
              {playlist.isPlaying &&
                (() => {
                  const total = playlist.queue.length;
                  const cur = playlist.currentIndex;
                  if (total <= 8) {
                    return (
                      <div className="flex items-center gap-0.5 px-1">
                        {Array.from({ length: total }).map((_, i) => (
                          <span
                            key={i}
                            className={`inline-block rounded-full transition-all ${
                              i === cur
                                ? 'bg-brand-500 h-2 w-2'
                                : 'h-1.5 w-1.5 bg-gray-300 dark:bg-gray-700'
                            }`}
                          />
                        ))}
                      </div>
                    );
                  }
                  return (
                    <span className="px-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {cur + 1}/{total}
                    </span>
                  );
                })()}

              {/* Next button — shows title when playing */}
              <button
                onClick={playlist.next}
                title="Next view"
                className="flex h-10 items-center justify-center gap-1.5 px-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
              >
                {playlist.isPlaying &&
                  playlist.queue.length > 1 &&
                  (() => {
                    const nextIdx = (playlist.currentIndex + 1) % playlist.queue.length;
                    const nextTitle = playlist.queue[nextIdx]?.title;
                    return nextTitle ? (
                      <span className="max-w-[80px] truncate text-xs">{nextTitle}</span>
                    ) : null;
                  })()}
                <SkipForward className="h-3.5 w-3.5 shrink-0" />
              </button>
            </div>

            {/* Exit button — shown when playlist is active (playing, or in focused/kiosk mode) */}
            {(playlist.isPlaying || playlist.mode !== 'normal') && (
              <button
                onClick={() => {
                  playlist.pause();
                  navigate('/playlist');
                }}
                title="Exit playlist"
                className="flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-sm text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <X className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Exit</span>
              </button>
            )}
          </>
        )}

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
            ref={notifBtnRef}
            onClick={handleOpenNotif}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <Bell className="h-5 w-5" />
            {alerts.length > 0 && (
              /* Outer wrapper has explicit h-4 w-4 so the ping fills + centers correctly */
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
                {/* Ping ring — 2 iterations only, plays on mount then stops */}
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-25 [animation-iteration-count:15]" />
                {/* Solid badge */}
                <span className="relative flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {alerts.length > 9 ? '9+' : alerts.length}
                </span>
              </span>
            )}
          </button>

          {notifOpen &&
            createPortal(
              <>
                <div className="fixed inset-0 z-[9998]" onClick={() => setNotifOpen(false)} />
                <div
                  className="shadow-theme-xl fixed z-[9999] w-96 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                  style={{ top: notifPos.top, right: notifPos.right }}
                >
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
                            navigate(`/views/rack/${alert.rack_id}`);
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
                      <button
                        onClick={() => {
                          setNotifOpen(false);
                          navigate('/notifications');
                        }}
                        className="text-brand-500 w-full px-4 py-2 text-center text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                      >
                        View all {alerts.length} alerts →
                      </button>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-gray-100 p-2 dark:border-gray-800">
                    <button
                      onClick={() => {
                        setNotifOpen(false);
                        navigate('/notifications');
                      }}
                      className="text-brand-500 w-full rounded-lg py-2 text-center text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      View all alerts →
                    </button>
                  </div>
                </div>
              </>,
              document.body
            )}
        </div>

        {/* User menu */}
        <div ref={userBtnRef} className="relative">
          <button
            onClick={handleOpenUser}
            className="flex items-center gap-2 rounded-lg border border-gray-200 py-1.5 pr-3 pl-2 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
          >
            {avatar ? (
              <img src={avatar} alt="Avatar" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="bg-brand-500 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white">
                {initial}
              </div>
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {displayName}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {userOpen &&
            createPortal(
              <>
                <div className="fixed inset-0 z-[9998]" onClick={() => setUserOpen(false)} />
                <div
                  className="shadow-theme-lg fixed z-[9999] w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 dark:border-gray-800 dark:bg-gray-900"
                  style={{ top: userPos.top, right: userPos.right }}
                >
                  <button
                    onClick={() => {
                      setUserOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setUserOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                  >
                    Settings
                  </button>
                  <hr className="my-1 border-gray-100 dark:border-gray-800" />
                  <button
                    onClick={logout}
                    className="text-error-500 w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    Sign Out
                  </button>
                </div>
              </>,
              document.body
            )}
        </div>
      </div>
    </header>
  );
};
