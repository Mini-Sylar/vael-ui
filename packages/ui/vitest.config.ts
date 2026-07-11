import vue from '@vitejs/plugin-vue'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  // Without this, Vite prebundles motion-v with its own copy of the Vue
  // runtime and every motion component crashes in renderSlot (dual instance).
  optimizeDeps: { exclude: ['motion-v'] },
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      headless: true,
    },
  },
})
