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
import { useNavigate } from 'react-router-dom';
import { useAppConfigSafe } from './AppConfigContext';
import type { PlaylistMode, PlaylistQueueItem } from '../playlist/PlaylistRegistry';

const QUEUE_STORAGE_KEY = 'cosmos-playlist-queue';
const INTERVAL_STORAGE_KEY = 'cosmos-playlist-interval';

interface PlaylistContextType {
  enabled: boolean;
  isPlaying: boolean;
  currentIndex: number;
  mode: PlaylistMode;
  queue: PlaylistQueueItem[];
  globalInterval: number;
  toggle: () => void;
  play: (mode?: PlaylistMode) => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  setMode: (mode: PlaylistMode) => void;
  setQueue: (queue: PlaylistQueueItem[]) => void;
  setGlobalInterval: (seconds: number) => void;
  // Legacy compat — views list derived from queue
  views: string[];
  intervalSeconds: number;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

const loadQueue = (): PlaylistQueueItem[] => {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PlaylistQueueItem[];
  } catch {
    return [];
  }
};

const saveQueue = (queue: PlaylistQueueItem[]) => {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    /* ignore */
  }
};

const loadInterval = (fallback: number): number => {
  try {
    const raw = localStorage.getItem(INTERVAL_STORAGE_KEY);
    if (!raw) return fallback;
    const n = parseInt(raw, 10);
    return isNaN(n) ? fallback : Math.max(5, n);
  } catch {
    return fallback;
  }
};

const saveInterval = (seconds: number) => {
  try {
    localStorage.setItem(INTERVAL_STORAGE_KEY, String(seconds));
  } catch {
    /* ignore */
  }
};

export const PlaylistProvider = ({ children }: { children: ReactNode }) => {
  const { features, playlist: config } = useAppConfigSafe();
  const navigate = useNavigate();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setModeState] = useState<PlaylistMode>('normal');
  const [queue, setQueueState] = useState<PlaylistQueueItem[]>(() => {
    const stored = loadQueue();
    if (stored.length > 0) return stored;
    // Default queue: Dashboard + Notifications
    return [
      { id: 'dashboard', title: 'Dashboard', route: '/cosmos', iconName: 'BarChart2', duration: 0 },
      { id: 'notifications', title: 'Notifications', route: '/notifications', iconName: 'Bell', duration: 0 },
    ];
  });
  const [globalInterval, setGlobalIntervalState] = useState<number>(() =>
    loadInterval(config.interval_seconds)
  );

  const setQueue = useCallback((q: PlaylistQueueItem[]) => {
    setQueueState(q);
    saveQueue(q);
  }, []);

  const setGlobalInterval = useCallback((seconds: number) => {
    const v = Math.max(5, seconds);
    setGlobalIntervalState(v);
    saveInterval(v);
  }, []);

  const setMode = useCallback((m: PlaylistMode) => {
    setModeState(m);
  }, []);

  // Navigate to a specific index (wraps around)
  const goTo = useCallback(
    (idx: number, q: PlaylistQueueItem[]) => {
      if (q.length === 0) return;
      const i = ((idx % q.length) + q.length) % q.length;
      setCurrentIndex(i);
      navigate(q[i].route);
    },
    [navigate]
  );

  const next = useCallback(() => goTo(currentIndex + 1, queue), [goTo, currentIndex, queue]);
  const prev = useCallback(() => goTo(currentIndex - 1, queue), [goTo, currentIndex, queue]);

  const requestFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
          /* ignore */
        });
      }
    } catch {
      /* ignore */
    }
  };

  const exitFullscreen = () => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          /* ignore */
        });
      }
    } catch {
      /* ignore */
    }
  };

  const play = useCallback(
    (m?: PlaylistMode) => {
      if (!features.playlist) return;
      if (m) setModeState(m);
      setIsPlaying(true);
      if (m === 'kiosk' || mode === 'kiosk') {
        requestFullscreen();
      }
      if (queue.length > 0) {
        navigate(queue[currentIndex]?.route ?? queue[0].route);
      }
    },
    [features.playlist, mode, queue, currentIndex, navigate]
  );

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (mode === 'kiosk') {
      exitFullscreen();
    }
  }, [mode]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Auto-advance timer
  const queueRef = useRef(queue);
  const navigateRef = useRef(navigate);
  const globalIntervalRef = useRef(globalInterval);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  useEffect(() => {
    globalIntervalRef.current = globalInterval;
  }, [globalInterval]);

  useEffect(() => {
    if (!isPlaying || !features.playlist || queue.length < 2) return;

    const advance = () => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % queueRef.current.length;
        navigateRef.current(queueRef.current[next].route);
        return next;
      });
    };

    // Use per-item duration if set, otherwise fall back to globalInterval
    const currentItem = queue[currentIndex];
    const itemDuration =
      currentItem?.duration && currentItem.duration > 0
        ? currentItem.duration
        : globalIntervalRef.current;
    const intervalMs = Math.max(5, itemDuration) * 1000;

    const t = setInterval(advance, intervalMs);
    return () => clearInterval(t);
  }, [isPlaying, features.playlist, queue.length, currentIndex, globalInterval]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived legacy compat
  const views = queue.map((q) => q.route);

  return (
    <PlaylistContext.Provider
      value={{
        enabled: features.playlist,
        isPlaying,
        currentIndex,
        mode,
        queue,
        globalInterval,
        toggle,
        play,
        pause,
        next,
        prev,
        setMode,
        setQueue,
        setGlobalInterval,
        views,
        intervalSeconds: globalInterval,
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
  return (
    ctx ?? {
      enabled: false,
      isPlaying: false,
      currentIndex: 0,
      mode: 'normal' as PlaylistMode,
      queue: [],
      globalInterval: 30,
      toggle: () => {
        /* noop */
      },
      play: () => {
        /* noop */
      },
      pause: () => {
        /* noop */
      },
      next: () => {
        /* noop */
      },
      prev: () => {
        /* noop */
      },
      setMode: () => {
        /* noop */
      },
      setQueue: () => {
        /* noop */
      },
      setGlobalInterval: () => {
        /* noop */
      },
      views: [],
      intervalSeconds: 30,
    }
  );
};
