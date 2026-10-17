import '../src/style.css'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { SSRContext } from 'vue/server-renderer'
import { afterEach, expect, test, vi } from 'vitest'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Button from '../src/components/Button/Button.vue'

const Root = () =>
  h(ConfigProvider, { theme: { primary: '#6366f1' } }, () =>
    h(Button, { 'data-testid': 'ssr-button' }, () => 'Save'),
  )

let host: HTMLElement | undefined
afterEach(() => host?.remove())

test('SSR renders the theme <style> in place, with nothing teleported to <head>', async () => {
  const ctx: SSRContext = {}
  const html = await renderToString(createSSRApp(Root), ctx)

  expect(html).toMatch(/<style>\[data-ui-theme='[^']+'\] \{ --ui-primary: #6366f1;/)
  // The style sits before the scope wrapper, inside the app's own markup.
  expect(html.indexOf('<style>')).toBeLessThan(html.indexOf('data-ui-theme='))
  expect(ctx.teleports ?? {}).toEqual({})
})

test('a theme value cannot close the <style> tag early', async () => {
  const app = createSSRApp(() =>
    h(ConfigProvider, { theme: { primary: 'red</style><script>alert(1)</script>' } }),
  )
  const html = await renderToString(app)
  expect(html).not.toContain('</style><script>')
})

test('the server markup hydrates without mismatches and the theme applies', async () => {
  const html = await renderToString(createSSRApp(Root))
  host = document.createElement('div')
  host.innerHTML = html
  document.body.append(host)

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    createSSRApp(Root).mount(host)
    const messages = [...warn.mock.calls, ...error.mock.calls].map((args) => args.join(' '))
    expect(messages.filter((m) => /hydration/i.test(m))).toEqual([])
  } finally {
    warn.mockRestore()
    error.mockRestore()
  }

  const button = host.querySelector('[data-testid="ssr-button"]')!
  expect(getComputedStyle(button).backgroundColor).toBe('rgb(99, 102, 241)')
})
