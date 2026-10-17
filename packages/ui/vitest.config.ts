import vue from '@vitejs/plugin-vue'
import { playwright } from '@vitest/browser-playwright'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  // Without this, Vite prebundles motion-v with its own copy of the Vue
  // runtime and every motion component crashes in renderSlot (dual instance).
  // vue/server-renderer is included up front so the SSR tests don't trigger a re-optimize mid-run.
  optimizeDeps: { exclude: ['motion-v'], include: ['vue/server-renderer'] },
  test: {
    // Upstream (Vue/motion-v) sentinels run separately: `pnpm test:spikes`.
    exclude: [...configDefaults.exclude, '**/*.spike.test.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      headless: true,
    },
  },
})
