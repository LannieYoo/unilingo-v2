import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@remotion/whisper-web'], // Whisper 패키지 최적화 제외
  },
  server: {
    port: 3001,
    strictPort: true,
    open: true,
    headers: {
      // SharedArrayBuffer 지원을 위한 헤더 (Whisper 사용 시 필요)
      // 주의: 외부 리소스 로딩에 영향을 줄 수 있음
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless', // require-corp 대신 credentialless 사용
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/vosk-models': {
        target: 'https://alphacephei.com/vosk/models',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/vosk-models/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      },
    },
  },
})

