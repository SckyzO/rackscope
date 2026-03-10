import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';


// ── HMR Firefox fixes ─────────────────────────────────────────────────────────
// Firefox has two distinct blank-screen failure modes with Vite HMR:
//
// 1. WebSocket disconnect (Docker restart / container rebuild):
//    Firefox keeps stale HTTP/2 connections and doesn't reconnect the HMR
//    socket automatically. Fix: reload after 2s if the socket stays down.
//
// 2. Transform error (broken import, syntax error in a changed file):
//    Chrome shows Vite's red error overlay. Firefox silently goes blank.
//    Fix: on vite:error, reload after 1s so the page comes back with the
//    full error overlay once Vite has re-processed the module.
if (import.meta.hot) {
  let reloadTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleReload = (delay: number) => {
    if (reloadTimer !== null) return;
    reloadTimer = setTimeout(() => {
      reloadTimer = null;
      window.location.reload();
    }, delay);
  };

  const cancelReload = () => {
    if (reloadTimer !== null) {
      clearTimeout(reloadTimer);
      reloadTimer = null;
    }
  };

  import.meta.hot.on('vite:ws:disconnect', () => scheduleReload(2000));
  import.meta.hot.on('vite:ws:connect', cancelReload);
  import.meta.hot.on('vite:error', () => scheduleReload(1000));
}

try {
  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>
  );
} catch (e) {
  document.body.innerHTML = `<div style="color: red; padding: 20px;"><h1>Critical Error</h1><pre>${e}</pre></div>`;
}
