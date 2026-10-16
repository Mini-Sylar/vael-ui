import { configDefaults, defineConfig } from 'vitest/config'
import base from './vite.config'

// `pnpm test:spikes`: only the upstream sentinels the default run excludes.
export default defineConfig({
  ...base,
  test: { ...base.test, include: ['tests/**/*.spike.test.ts'], exclude: configDefaults.exclude },
})
