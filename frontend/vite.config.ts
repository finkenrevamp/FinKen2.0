import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@emotion/react', 
      '@emotion/styled', 
      '@mui/material', 
      '@mui/x-data-grid',
      'prop-types'
    ],
    exclude: ['@mui/styled-engine'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  define: {
    global: 'globalThis',
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
})
