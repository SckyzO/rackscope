import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // tsconfigPaths: true reads aliases directly from tsconfig.app.json — single source of truth.
    // The explicit alias entries below are kept only for @plugins (external volume mount)
    // and as a fallback for tooling that doesn't parse tsconfig paths.

    alias: {
      // @plugins → /app/plugins (mounted via docker-compose volume, not in tsconfig include)
      '@plugins': path.resolve(__dirname, 'plugins'),
      // @app and @src are declared in tsconfig.app.json paths — duplicated here
      // for backwards-compat with any tool that reads vite.config.ts directly.
      '@app': path.resolve(__dirname, 'src/app'),
      '@src': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: ['apexcharts', 'react-apexcharts', 'monaco-editor'],
  },
  build: {
    // rollupOptions renamed to rolldownOptions in Vite 8 (Rolldown engine).
    rolldownOptions: {
      output: {
        // Keep Monaco out of the main bundle — it's ~7 MB and only needed in editor pages.
        // manualChunks function form is deprecated in Vite 8; migrate to codeSplitting
        // config when the Rolldown codeSplitting API stabilises.
        manualChunks: (id) => {
          if (id.includes('monaco-editor')) return 'monaco';
        },
      },
    },
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
