import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  // Keep a single Vue runtime instance across the linked workspace lib and
  // motion-v (see the dual-instance crash documented in packages/ui tests).
  resolve: { dedupe: ['vue'] },
  optimizeDeps: { exclude: ['motion-v'] },
})
