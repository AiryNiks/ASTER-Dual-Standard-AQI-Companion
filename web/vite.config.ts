import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Aster is a fully client-side SPA — weather, air-quality and geocoding data come
// straight from public HTTPS APIs (Open-Meteo, BigDataCloud). No backend, no proxy.
//
// GitHub Pages serves the site from a /<repo-name>/ subpath, so the built asset URLs
// need that prefix. Vercel serves from the domain root, so it must stay "/". The
// GITHUB_PAGES env var (set only by .github/workflows/deploy-pages.yml) switches it.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/ASTER-Dual-Standard-AQI-Companion/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
  },
})
