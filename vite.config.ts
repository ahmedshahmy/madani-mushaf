import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site: https://<user>.github.io/madani-mushaf/
// Override with VITE_BASE for a custom domain or user site.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: process.env.VITE_BASE ?? (command === 'build' ? '/madani-mushaf/' : '/'),
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
  },
}))
