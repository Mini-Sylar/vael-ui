// RFC §3.7: every component has an appearance, `initial` by part, opt-in, never on hydration.
import '../src/style.css'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import Button from '../src/components/Button/Button.vue'

const frame = () => new Promise(requestAnimationFrame)
const look = { initial: { root: { opacity: 0, y: 4 } } }

test('a component plays its `initial` when it mounts', async () => {
  const screen = await render(() => h(Button as never, { motion: look }, () => 'Save'))
  const root = screen.container.querySelector<HTMLElement>('.ui-button')!
  await vi.waitFor(() =>
    expect(root.getAnimations().length + (root.style.transition ? 1 : 0)).toBeGreaterThan(0),
  )
  expect(Number(getComputedStyle(root).opacity)).toBeLessThan(1)
})

test('nothing on mount unless asked, and `false` turns it off', async () => {
  const screen = await render(() => [
    h(Button as never, { class: 'plain' }, () => 'Plain'),
    h(Button as never, { class: 'off', motion: false }, () => 'Off'),
  ])
  for (let i = 0; i < 3; i++) await frame()
  for (const el of screen.container.querySelectorAll<HTMLElement>('.ui-button'))
    expect(getComputedStyle(el).opacity).toBe('1')
})

test('hydrated: shows as the server rendered it, no appearance', async () => {
  const app = () => h(Button as never, { motion: look }, () => 'Server')
  const html = await renderToString(createSSRApp({ render: app }))
  const host = document.createElement('div')
  host.innerHTML = html
  document.body.append(host)
  createSSRApp({ render: app }).mount(host)
  const root = host.querySelector<HTMLElement>('.ui-button')!
  for (let i = 0; i < 4; i++) {
    await frame()
    expect(getComputedStyle(root).opacity).toBe('1')
  }
  host.remove()
})
