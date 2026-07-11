import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// The actual library build: compiles src/generated/ (real vael-ui component
// sources, vapor-marked by scripts/gen.mjs) into a standalone Vapor bundle.
// Separate from vite.config.ts (dev server + vitest) because library mode's
// `build` settings don't compose with an app-mode dev server.
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: resolve(__dirname, '../ui/dist/vapor'),
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/generated/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['vue', 'vael-ui'],
    },
  },
})
