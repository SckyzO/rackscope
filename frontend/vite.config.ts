import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
