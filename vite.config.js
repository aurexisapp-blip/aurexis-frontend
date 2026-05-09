import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/health': 'http://localhost:8000',
      '/best_pick': 'http://localhost:8000',
      '/best_pick_v2': 'http://localhost:8000',
      '/analyze': 'http://localhost:8000',
      '/top_movers': 'http://localhost:8000',
      '/news': 'http://localhost:8000',
      '/portfolio': 'http://localhost:8000',
      '/watchlist': 'http://localhost:8000',
      '/account': 'http://localhost:8000',
    },
  },
})
