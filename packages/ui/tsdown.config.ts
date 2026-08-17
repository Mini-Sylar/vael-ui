import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'
import { collectBarrelEntries } from '../scripts/collect-barrel-entries.mjs'

export default defineConfig({
  entry: {
    index: './src/index.ts',
    'style-entry': './src/style-entry.ts',
    'resolver/index': './src/resolver/index.ts',
    'nuxt/index': './src/nuxt/index.ts',
    ...collectBarrelEntries('./src/index.ts', process.cwd()),
  },
  platform: 'neutral',
  plugins: [Vue({ isProduction: true })],
  dts: { vue: true },
  css: { minify: true, splitting: true, inject: true },
  minify: true,
})
