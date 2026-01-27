import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>
  );
} catch (e) {
  document.body.innerHTML = `<div style="color: red; padding: 20px;"><h1>Critical Error</h1><pre>${e}</pre></div>`;
}
