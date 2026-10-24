import '../src/style.css'
import { expect, test } from 'vitest'
import ColorSchemeFixture from './fixtures/ColorSchemeFixture.vue'

// Its own file: in the browser every useColorScheme call shares one state, and the first call's
// `initial` sets it. A fresh file is a fresh page, so this call is the first.
test('an explicit initial mode resolves on the first render, before mount, so server HTML matches it', async () => {
  const { createSSRApp, h } = await import('vue')
  const { renderToString } = await import('vue/server-renderer')
  // The test browser prefers light, so 'dark' can only come from `initial`.
  expect(matchMedia('(prefers-color-scheme: dark)').matches).toBe(false)
  const html = await renderToString(
    createSSRApp({ render: () => h(ColorSchemeFixture, { initial: 'dark' }) }),
  )
  expect(html).toContain('data-testid="resolved">dark<')
})
