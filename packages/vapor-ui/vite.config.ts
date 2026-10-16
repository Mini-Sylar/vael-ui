import vue from '@vitejs/plugin-vue'
import { playwright } from '@vitest/browser-playwright'
import { configDefaults, defineConfig } from 'vitest/config'

// Vitest config for the test suite (`pnpm test`). The library build has its
// own config: tsdown.config.ts.
export default defineConfig({
  plugins: [vue()],
  resolve: { dedupe: ['vue'] },
  test: {
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
