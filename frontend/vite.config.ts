import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/telemetryHub': {
        target: 'http://localhost:80',
        changeOrigin: true,
        ws: true,
      },
      '/api': {
        target: 'http://localhost:80',
        changeOrigin: true,
      },
      '/whep': {
        target: 'http://localhost:80',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
