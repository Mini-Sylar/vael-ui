import vue from '@vitejs/plugin-vue'
import { playwright } from '@vitest/browser-playwright'
import { configDefaults, defineConfig } from 'vitest/config'

// Vitest config for the test suite (`pnpm test`). The library build has its
// own config: tsdown.config.ts.
export default defineConfig({
  plugins: [vue()],
  resolve: { dedupe: ['vue'] },
  test: {
    // A test that fails on a CI runner runs again, up to twice, before it fails the build. The suite
    // watches real motion in a real browser, and a shared runner can be slow enough to miss a
    // frame. A real bug fails all three times; a test that needed a retry shows in the report.
    retry: process.env.CI ? 2 : 0,
    // Upstream Vue Vapor sentinels run separately: `pnpm test:spikes`.
    exclude: [...configDefaults.exclude, '**/*.spike.test.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      headless: true,
    },
  },
})
