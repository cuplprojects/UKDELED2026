import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 3001,
    open: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5120',
        changeOrigin: true,
        secure: false
      }
    }
  },
})
