/** `linked` in the built Vapor build. Run `pnpm build` first. */
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import LinkedVaporRoot from './fixtures/LinkedVaporRoot.vue'

const frame = () => new Promise(requestAnimationFrame)

test('Vapor: the page recedes behind a drawer and comes back; a closed sheet leaves it alone', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(LinkedVaporRoot)
  const root = app.mount(host) as unknown as { drawer: boolean; sheet: boolean }
  const scale = () => getComputedStyle(document.querySelector('.page')!).scale
  try {
    for (let i = 0; i < 10; i++) await frame()
    expect(scale()).toBe('none')
    root.drawer = true
    await vi.waitFor(() => expect(scale()).toBe('0.9'), { timeout: 2000 })
    root.drawer = false
    await vi.waitFor(() => expect(scale()).toBe('none'), { timeout: 2000 })
    root.sheet = true
    await vi.waitFor(() => expect(scale()).toBe('0.9'), { timeout: 2000 })
    root.sheet = false
    await vi.waitFor(() => expect(scale()).toBe('none'), { timeout: 2000 })
  } finally {
    app.unmount()
    host.remove()
  }
})
