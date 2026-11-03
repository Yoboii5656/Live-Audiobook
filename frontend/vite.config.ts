import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset URLs, so the built site works from any folder (e.g. GitHub Pages /<repo>/)
  base: './',
  // The speech worker uses ES module imports
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
  },
})
