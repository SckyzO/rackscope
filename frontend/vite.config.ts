import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // @plugins → /app/plugins (mounted via docker-compose volume)
      '@plugins': path.resolve(__dirname, 'plugins'),
      // @app → /app/src/app  (used by plugin widgets to import dashboard/*)
      '@app': path.resolve(__dirname, 'src/app'),
      // @src → /app/src      (used by plugin widgets to import services/*)
      '@src': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: ['apexcharts', 'react-apexcharts'],
  },
  server: {
    host: true, // Needed for Docker exposure
    port: 5173,
    allowedHosts: ['frontend', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
});
