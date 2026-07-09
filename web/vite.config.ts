import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Aster is a fully client-side SPA — weather, air-quality and geocoding data come
// straight from public HTTPS APIs (Open-Meteo, BigDataCloud). No backend, no proxy.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
})
