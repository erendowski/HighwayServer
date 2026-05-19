import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // VITE_PROXY_TARGET: dev sunucusu nereye proxy yapacak?
  //   Docker ile çalışıyorsan: http://localhost (nginx port 80)
  //   Sadece dotnet run ile çalışıyorsan: http://localhost:5000
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost'

  return {
    plugins: [react(), tailwindcss()],
    build: {
      outDir: env.VITE_OUT_DIR || '../wwwroot',
      emptyOutDir: true,
    },
    server: {
      proxy: {
        '/telemetryHub': { target: proxyTarget, changeOrigin: true, ws: true },
        '/api':           { target: proxyTarget, changeOrigin: true },
        '/whep':          { target: proxyTarget, changeOrigin: true, ws: true },
      },
    },
  }
})
