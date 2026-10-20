import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The browser calls /api/... on the Vite dev server, which forwards it to the backend.
    // Same origin for the browser, so no CORS setup is needed.
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:3001',
    },
  },
})
