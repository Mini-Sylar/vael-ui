import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'

export default defineConfig({
  // SPIKE: extra per-component entries alongside the barrel so rolldown has
  // chunk boundaries to split CSS along (a single-entry build collapses
  // everything into one dist/index.js + one dist/style.css regardless of
  // css.splitting). See plans/ discussion on per-component CSS chunking.
  entry: [
    './src/index.ts',
    './src/components/Button/Button.vue',
    './src/components/ButtonGroup/ButtonGroup.vue',
    './src/components/Loader/Loader.vue',
    './src/components/PullToRefresh/PullToRefresh.vue',
  ],
  platform: 'neutral',
  plugins: [Vue({ isProduction: true })],
  dts: { vue: true },
  css: { minify: true, splitting: true, inject: true },
  minify: true,
})
