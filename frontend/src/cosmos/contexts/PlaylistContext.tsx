/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppConfigSafe } from './AppConfigContext';

interface PlaylistContextType {
  enabled: boolean;       // features.playlist from AppConfig
  isPlaying: boolean;
  currentIndex: number;
  views: string[];
  intervalSeconds: number;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export const PlaylistProvider = ({ children }: { children: ReactNode }) => {
  const { features, playlist: config } = useAppConfigSafe();
  const navigate = useNavigate();
  const location = useLocation();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const views = config.views.filter(Boolean);
  const intervalMs = Math.max(5, config.interval_seconds) * 1000;

  // Sync currentIndex when user navigates manually
  useEffect(() => {
    const idx = views.indexOf(location.pathname);
    if (idx !== -1) queueMicrotask(() => setCurrentIndex(idx));
  }, [location.pathname, views.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate to a specific index (wraps around)
  const goTo = useCallback(
    (idx: number) => {
      if (views.length === 0) return;
      const i = ((idx % views.length) + views.length) % views.length;
      setCurrentIndex(i);
      navigate(views[i]);
    },
    [views, navigate]
  );

  const next = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);
  const prev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);
  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying((p) => !p), []);

  // Auto-advance timer — refs updated in effects to avoid stale closures
  const viewsRef = useRef(views);
  const navigateRef = useRef(navigate);
  useEffect(() => { viewsRef.current = views; }, [views]);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  useEffect(() => {
    if (!isPlaying || !features.playlist || views.length < 2) return;

    const t = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % viewsRef.current.length;
        navigateRef.current(viewsRef.current[next]);
        return next;
      });
    }, intervalMs);

    return () => clearInterval(t);
  }, [isPlaying, features.playlist, views.length, intervalMs]);

  return (
    <PlaylistContext.Provider
      value={{
        enabled: features.playlist,
        isPlaying,
        currentIndex,
        views,
        intervalSeconds: config.interval_seconds,
        toggle,
        play,
        pause,
        next,
        prev,
      }}
    >
      {children}
    </PlaylistContext.Provider>
  );
};

export const usePlaylist = (): PlaylistContextType => {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error('usePlaylist must be used within PlaylistProvider');
  return ctx;
};

// Safe hook — returns disabled defaults when outside provider
export const usePlaylistSafe = (): PlaylistContextType => {
  const ctx = useContext(PlaylistContext);
  return ctx ?? {
    enabled: false,
    isPlaying: false,
    currentIndex: 0,
    views: [],
    intervalSeconds: 30,
    toggle: () => { /* noop */ },
    play: () => { /* noop */ },
    pause: () => { /* noop */ },
    next: () => { /* noop */ },
    prev: () => { /* noop */ },
  };
};
