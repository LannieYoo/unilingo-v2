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
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/vosk-models': {
        target: 'https://alphacephei.com/vosk/models',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/vosk-models/, ''),
      },
    },
  },
})

