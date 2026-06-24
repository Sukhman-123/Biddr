import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config for the Biddr client.
// - Dev proxy forwards /api and /socket.io to the local Express server on
//   port 5001 so the front-end can use relative URLs in both dev and prod.
// - Production builds go to ./dist and are deployed to Netlify (see
//   netlify.toml at the repo root for the SPA + rewrite rules).
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
      // Prevent the browser from caching CSS/JS during dev
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  preview: {
    port: 4173,
  },
})