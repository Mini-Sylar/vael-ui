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
    // A test that fails on a CI runner runs again, up to twice, before it fails the build. The suite
    // watches real motion in a real browser, and a shared runner can be slow enough to miss a
    // frame. A real bug fails all three times; a test that needed a retry shows in the report.
    retry: process.env.CI ? 2 : 0,
    // Read in tests with `inject('ci')`: speed budgets get room on a shared runner (tests/utils/budget.ts).
    provide: { ci: !!process.env.CI },
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
