/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    // Only Vitest unit/UI tests here; Playwright specs in tests-e2e/ run with `npx playwright test`
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
  },
})
