import { useState, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { X } from 'lucide-react';
import { CosmosSidebar } from './CosmosSidebar';
import { CosmosHeader } from './CosmosHeader';
import { PageTitleProvider } from '../contexts/PageTitleContext';
import { AppConfigProvider } from '../contexts/AppConfigContext';
import { PluginsMenuProvider } from '../../context/PluginsMenuContext';
import { PlaylistProvider } from '../contexts/PlaylistContext';
import { usePlaylistSafe } from '../contexts/PlaylistContext';
import '../cosmos.css';

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

const CosmosInnerLayout = () => {
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setPageLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('cosmos-dark-mode');
    return saved === null ? true : saved === 'true';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);

  const handleToggleDark = () => {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    rootRef.current?.classList.toggle('dark', next);
    localStorage.setItem('cosmos-dark-mode', String(next));
    setIsDark(next);
  };

  const playlist = usePlaylistSafe();
  const isKiosk = playlist.mode === 'kiosk' && playlist.isPlaying;
  const isFocused = playlist.mode === 'focused' && playlist.isPlaying;

  // In focused mode: force sidebar collapsed
  const effectiveCollapsed = isFocused ? true : sidebarCollapsed;

  return (
    <>
      {/* Page load preloader */}
      {pageLoading && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-white dark:bg-gray-950">
          <div className="border-brand-500 h-16 w-16 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      )}
      <div ref={rootRef} className={isDark ? 'cosmos-root dark' : 'cosmos-root'}>
        <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-950">
          {/* Sidebar — hidden in kiosk mode */}
          {!isKiosk && <CosmosSidebar collapsed={effectiveCollapsed} />}

          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header — hidden in kiosk mode */}
            {!isKiosk && (
              <CosmosHeader
                isDark={isDark}
                toggleDark={handleToggleDark}
                sidebarCollapsed={effectiveCollapsed}
                onToggleSidebar={() => setSidebarCollapsed((p) => !p)}
              />
            )}
            <main className="cosmos-scrollbar flex flex-1 flex-col overflow-y-auto p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </div>

      {/* Kiosk exit float button */}
      <KioskExitButton />
    </>
  );
};

// ── CosmosLayout — providers wrapping the inner layout ────────────────────────

export const CosmosLayout = () => (
  <AppConfigProvider>
    <PluginsMenuProvider>
      <PlaylistProvider>
        <PageTitleProvider>
          <CosmosInnerLayout />
        </PageTitleProvider>
      </PlaylistProvider>
    </PluginsMenuProvider>
  </AppConfigProvider>
);
