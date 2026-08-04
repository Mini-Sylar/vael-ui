import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/components/Button/Button.vue',
    './src/components/ButtonGroup/ButtonGroup.vue',
    './src/components/Loader/Loader.vue',
    './src/components/PullToRefresh/PullToRefresh.vue',
    './src/components/ConfigProvider/ConfigProvider.vue',
    './src/components/Toaster/Toaster.vue',
    './src/components/Message/Message.vue',
    './src/components/Progress/Progress.vue',
    './src/components/Skeleton/Skeleton.vue',
  ],
  platform: 'neutral',
  plugins: [Vue({ isProduction: true })],
  dts: { vue: true },
  css: { minify: true, splitting: true, inject: true },
  minify: true,
})
