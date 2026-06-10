import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  server: {
    port: 5101,
    strictPort: true,
  },
  preview: {
    port: 5101,
    strictPort: true,
  },
})
