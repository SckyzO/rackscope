import { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { X } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { useTheme } from '@src/context/ThemeContext';
import { PageTitleProvider } from '../contexts/PageTitleContext';
import { AppConfigProvider, useAppConfigSafe } from '../contexts/AppConfigContext';
import { PluginsMenuProvider } from '@src/context/PluginsMenuContext';
import { PlaylistProvider } from '../contexts/PlaylistContext';
import { usePlaylistSafe } from '../contexts/PlaylistContext';
import { PlaylistCountdownBar } from '../components/PlaylistCountdown';
import { AlertToastContainer } from '../components/AlertToastContainer';
import { SetupWizard, LS_KEY as SETUP_LS_KEY } from '../components/SetupWizard';
import { api } from '@src/services/api';
import '../app.css';

// ── MatrixBackground ──────────────────────────────────────────────────────────
// Subtle canvas background shown when darkTheme='matrix'. z-index 0, opacity 0.35.
// Positioned OUTSIDE rs-root so the CSS z-index stacking works correctly.

const MATRIX_ALPHABET =
  'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const MATRIX_FONT_SIZE = 16;

const MatrixBackground = () => {
  const { mode, darkTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = mode === 'dark' && darkTheme === 'matrix';

  const startRain = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas)
      return () => {
        /* noop — canvas not mounted */
      };
    const ctx = canvas.getContext('2d');
    if (!ctx)
      return () => {
        /* noop — context unavailable */
      };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drops.length = 0;
      drops.push(...Array(Math.floor(canvas.width / MATRIX_FONT_SIZE)).fill(1));
    };
    const drops: number[] = [];
    resize();
    window.addEventListener('resize', resize);

    const interval = setInterval(() => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(15, 255, 0, 0.5)';
      ctx.font = `${MATRIX_FONT_SIZE}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const char = MATRIX_ALPHABET[Math.floor(Math.random() * MATRIX_ALPHABET.length)];
        ctx.fillText(char, i * MATRIX_FONT_SIZE, drops[i] * MATRIX_FONT_SIZE);
        if (drops[i] * MATRIX_FONT_SIZE > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }, 45);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const stop = startRain();
    return stop;
  }, [active, startRain]);

  return (
    <>
      <canvas id="matrix-bg-canvas" ref={canvasRef} aria-hidden="true" />
      <div id="matrix-dimmer" aria-hidden="true" />
    </>
  );
};

// ── KioskExitButton ────────────────────────────────────────────────────────────
// Floating exit button shown only in kiosk mode (fixed bottom-right)

const KioskExitButton = () => {
  const playlist = usePlaylistSafe();

  if (!(playlist.mode === 'kiosk' && playlist.isPlaying)) return null;

  const handleExit = () => {
    playlist.pause();
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

  return (
    <button
      onClick={handleExit}
      title="Exit kiosk mode"
      className="fixed right-6 bottom-6 z-[9999] flex items-center gap-2 rounded-xl bg-black/60 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-black/80"
    >
      <X className="h-4 w-4" />
      Exit Playlist
    </button>
  );
};

// ── Inner layout — needs access to PlaylistContext ─────────────────────────────

const AppInnerLayout = () => {
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setPageLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const { features } = useAppConfigSafe();
  const [isDark, setIsDark] = useState(() => {
    // Theme resolution: check new key first (theme-mode, shared with ThemeContext),
    // then legacy key (cosmos-dark-mode, pre-v1.0 migration), then default to dark.
    const primary = localStorage.getItem('theme-mode');
    if (primary !== null) return primary !== 'light';
    const legacy = localStorage.getItem('cosmos-dark-mode');
    return legacy === null ? true : legacy === 'true';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showWizard, setShowWizard] = useState(() => !localStorage.getItem(SETUP_LS_KEY));

  // Override: if backend has wizard disabled, never show regardless of localStorage
  const wizardEnabled = features.wizard !== false;
  const shouldShowWizard = showWizard && wizardEnabled;

  const rootRef = useRef<HTMLDivElement>(null);

  const handleToggleDark = () => {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    rootRef.current?.classList.toggle('dark', next);

    // Custom event dispatched to sync ThemeContext (separate React tree).
    // Context is not used here to avoid prop-drilling through AppLayout.
    localStorage.setItem('theme-mode', next ? 'dark' : 'light');
    window.dispatchEvent(new CustomEvent('rackscope-theme-mode', { detail: { dark: next } }));
    setIsDark(next);
  };

  // Listen for mode changes triggered by ThemeContext (e.g. clicking a theme palette)
  useEffect(() => {
    const handler = (e: CustomEvent<{ dark: boolean }>) => {
      const next = e.detail.dark;
      document.documentElement.classList.toggle('dark', next);
      rootRef.current?.classList.toggle('dark', next);
      setIsDark(next);
    };
    window.addEventListener('rackscope-theme-mode', handler as EventListener);
    return () => window.removeEventListener('rackscope-theme-mode', handler as EventListener);
  }, []);

  const playlist = usePlaylistSafe();
  const isKiosk = playlist.mode === 'kiosk' && playlist.isPlaying;
  const isFocused = playlist.mode === 'focused' && playlist.isPlaying;

  const effectiveCollapsed = isFocused ? true : sidebarCollapsed;

  const { plugins } = useAppConfigSafe();

  const [ribbonVisible, setRibbonVisible] = useState(
    () => localStorage.getItem('rackscope.demo.ribbon') !== 'hidden'
  );

  useEffect(() => {
    const handler = () =>
      setRibbonVisible(localStorage.getItem('rackscope.demo.ribbon') !== 'hidden');
    window.addEventListener('rackscope-demo-ribbon', handler);
    return () => window.removeEventListener('rackscope-demo-ribbon', handler);
  }, []);

  const handlePermanentWizardDisable = useCallback(async () => {
    try {
      await api.disableSetupWizard();
      localStorage.setItem(SETUP_LS_KEY, 'true');
      setShowWizard(false);
    } catch (err) {
      console.error('Failed to disable wizard:', err);
      // Still dismiss on failure — user can try again later
      localStorage.setItem(SETUP_LS_KEY, 'true');
      setShowWizard(false);
    }
  }, []);

  return (
    <>
      {/* Demo ribbon — diagonal corner badge when simulator is active */}
      {plugins.simulator && ribbonVisible && (
        <div className="pointer-events-none fixed top-0 left-0 z-[9998] h-20 w-20 overflow-hidden">
          <div className="bg-brand-500/90 absolute top-[18px] -left-[26px] w-[108px] -rotate-45 py-1 text-center text-[9px] font-bold tracking-widest text-white uppercase shadow-sm">
            demo
          </div>
        </div>
      )}
      {pageLoading && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-white dark:bg-gray-950">
          <div className="border-brand-500 h-16 w-16 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      )}
      <div ref={rootRef} className={isDark ? 'rs-root dark' : 'rs-root'}>
        <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-950">
          {!isKiosk && <AppSidebar collapsed={effectiveCollapsed} />}

          <div className="flex flex-1 flex-col overflow-hidden">
            {!isKiosk && (
              <AppHeader
                isDark={isDark}
                toggleDark={handleToggleDark}
                sidebarCollapsed={effectiveCollapsed}
                onToggleSidebar={() => setSidebarCollapsed((p) => !p)}
              />
            )}
            <main className="rs-scrollbar flex flex-1 flex-col overflow-y-auto p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </div>

      <PlaylistCountdownBar />
      <KioskExitButton />
      {shouldShowWizard && (
        <SetupWizard
          onDismiss={() => {
            localStorage.setItem(SETUP_LS_KEY, 'true');
            setShowWizard(false);
          }}
          onPermanentDisable={handlePermanentWizardDisable}
        />
      )}
      {/* Canvas rendered outside rs-root so CSS z-index stacking works correctly */}
      <MatrixBackground />
      <AlertToastContainer />
    </>
  );
};

// ── AppLayout — providers wrapping the inner layout ────────────────────────

export const AppLayout = () => (
  <AppConfigProvider>
    <PluginsMenuProvider>
      <PlaylistProvider>
        <PageTitleProvider>
          <AppInnerLayout />
        </PageTitleProvider>
      </PlaylistProvider>
    </PluginsMenuProvider>
  </AppConfigProvider>
);
