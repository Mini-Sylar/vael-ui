// A closed menu sets up as little as it can: its popup parts wait for the first open.
import '../src/style.css'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick } from 'vue'
import Menu from '../src/components/Menu/Menu.vue'

beforeEach(() => {
  for (const el of document.querySelectorAll('.ui-menu-positioner')) el.remove()
})

const items = Array.from({ length: 5 }, (_, i) => ({
  label: `Item ${i + 1}`,
  value: String(i + 1),
}))
const trigger = () => h('button', { type: 'button', class: 'open' }, 'Open')
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

function many(count: number, props: Record<string, unknown> = {}) {
  return defineComponent({
    setup: () => () =>
      Array.from({ length: count }, () =>
        h(Menu as never, { items, motion: false, ...props }, { trigger }),
      ),
  })
}

// Each read of document.fonts.ready makes the browser update style and layout.
let fontsReads = 0
beforeEach(() => {
  fontsReads = 0
  const fonts = document.fonts
  const ready = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(fonts), 'ready')!
  Object.defineProperty(fonts, 'ready', {
    configurable: true,
    get: () => (fontsReads++, ready.get!.call(fonts)),
  })
})
afterEach(() => {
  delete (document.fonts as unknown as { ready?: unknown }).ready
})

test('closed menus never read document.fonts.ready; the first open reads it once', async () => {
  const screen = await render(many(20))
  await nextTick()
  await frame()
  expect(fontsReads).toBe(0)
  await screen.container.querySelector<HTMLElement>('.open')!.click()
  await vi.waitFor(() => expect(document.querySelector('[role="menu"]')).not.toBeNull())
  await vi.waitFor(() => expect(fontsReads).toBe(1))
})
