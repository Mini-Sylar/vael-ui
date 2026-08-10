import { existsSync, readdirSync } from 'node:fs'
import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'

const componentEntries = readdirSync('./src/components', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((dir) => `./src/components/${dir.name}/${dir.name}.vue`)
  .filter((path) => existsSync(path))

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/style-entry.ts',
    './src/resolver/index.ts',
    './src/nuxt/index.ts',
    ...componentEntries,
  ],
  platform: 'neutral',
  plugins: [Vue({ isProduction: true })],
  dts: { vue: true },
  css: { minify: true, splitting: true, inject: true },
  minify: true,
})
