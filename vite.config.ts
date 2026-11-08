// filepath: vite.config.ts
import tailwindcss from 'tailwindcss'
import { defineConfig } from 'vite'

export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
})
