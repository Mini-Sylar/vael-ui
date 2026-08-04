import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'

export default defineConfig({
  // Per-component entries give rolldown chunk boundaries to split CSS
  // along (a single entry collapses everything into one dist/index.js +
  // one dist/style.css regardless of css.splitting).
  entry: [
    './src/index.ts',
    './src/components/Button/Button.vue',
    './src/components/ButtonGroup/ButtonGroup.vue',
    './src/components/Loader/Loader.vue',
    './src/components/PullToRefresh/PullToRefresh.vue',
    './src/components/ConfigProvider/ConfigProvider.vue',
  ],
  platform: 'neutral',
  plugins: [Vue({ isProduction: true })],
  dts: { vue: true },
  css: { minify: true, splitting: true, inject: true },
  minify: true,
})
