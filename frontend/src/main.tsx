import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';


// ── HMR WebSocket reconnect handler (Firefox fix) ────────────────────────────
// Firefox keeps stale WebSocket connections in its HTTP/2 pool between Docker
// restarts. When the HMR socket disconnects, Firefox won't auto-reload.
// This forces a page reload 2s after disconnect if the socket doesn't reconnect.
if (import.meta.hot) {
  let reloadTimer: ReturnType<typeof setTimeout> | null = null;

  import.meta.hot.on('vite:ws:disconnect', () => {
    reloadTimer = setTimeout(() => {
      window.location.reload();
    }, 2000);
  });

  import.meta.hot.on('vite:ws:connect', () => {
    if (reloadTimer !== null) {
      clearTimeout(reloadTimer);
      reloadTimer = null;
    }
  });
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
