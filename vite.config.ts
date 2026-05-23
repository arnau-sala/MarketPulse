import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Forward `/api/*` to FastAPI in development so the frontend can call the
// gateway without CORS friction. The backend port is fixed to 8000 to match
// the project's README and `backend/.env.example`.
const BACKEND_PROXY_TARGET = 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: BACKEND_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
})
