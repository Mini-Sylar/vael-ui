export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  modules: ['vael-ui/nuxt'],
  // `pnpm dev:vapor` runs the same page on the Vapor build.
  vaelUi: { variant: process.env.VAEL_UI_VARIANT === 'vapor' ? 'vapor' : 'vdom' },
  devtools: { enabled: false },
})
