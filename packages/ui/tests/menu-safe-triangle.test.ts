// The safe triangle: heading from a row to its open submenu across another submenu row keeps the
// first open; leaving the triangle hands over to the row under the pointer.
import '../src/style.css'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import Menu from '../src/components/Menu/Menu.vue'

beforeEach(() => {
  for (const el of document.querySelectorAll('.ui-menu-positioner')) el.remove()
})

const items = [
  { label: 'Share', items: [{ label: 'Copy link' }, { label: 'Email' }, { label: 'Embed' }] },
  { label: 'Move', items: [{ label: 'Inbox' }, { label: 'Archive' }] },
  { label: 'Delete' },
]
const row = (label: string) =>
  [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) =>
    el.textContent?.trim().startsWith(label),
  )!
const expanded = (label: string) => row(label).getAttribute('aria-expanded')
const mouse = (el: EventTarget, type: string, x: number, y: number) =>
  el.dispatchEvent(
    new MouseEvent(type, {
      clientX: x,
      clientY: y,
      bubbles: type !== 'mouseenter' && type !== 'mouseleave',
    }),
  )
const move = (x: number, y: number) =>
  document.dispatchEvent(
    new PointerEvent('pointermove', { clientX: x, clientY: y, pointerType: 'mouse' }),
  )
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function openShare() {
  const open = shallowRef(true)
  await render(() =>
    h(
      Menu as never,
      { open: open.value, items, 'onUpdate:open': (v: boolean) => (open.value = v) },
      {
        trigger: () => h('button', 'Actions'),
      },
    ),
  )
  await vi.waitFor(() => expect(row('Share')).toBeTruthy())
  const share = row('Share').getBoundingClientRect()
  mouse(row('Share'), 'mouseenter', share.right - 20, share.top + share.height / 2)
  await vi.waitFor(() => expect(expanded('Share')).toBe('true'))
  const panel = [...document.querySelectorAll<HTMLElement>('.ui-menu-panel')].find((el) =>
    el.textContent?.includes('Copy link'),
  )!
  await vi.waitFor(() => expect(panel.getBoundingClientRect().width).toBeGreaterThan(0))
  return { share, panel: panel.getBoundingClientRect(), panelEl: panel }
}

test('a slow diagonal across another submenu row keeps the open submenu', async () => {
  const { share, panel, panelEl } = await openShare()
  const exit = { x: share.right - 20, y: share.bottom - 1 }
  mouse(row('Share'), 'mouseleave', exit.x, exit.y)
  // Inside the triangle, resting on Move for longer than a hover takes to open it.
  const move1 = row('Move').getBoundingClientRect()
  const x = exit.x + 6
  const y = Math.min(move1.top + 4, exit.y + (panel.bottom - exit.y) * 0.1)
  mouse(row('Move'), 'mouseenter', x, y)
  move(x, y)
  await wait(250)
  expect(expanded('Share')).toBe('true')
  expect(expanded('Move')).toBe('false')
  mouse(panelEl, 'mouseenter', panel.left + 4, panel.top + 10)
  await wait(300)
  expect(expanded('Share')).toBe('true')
})

test('leaving the triangle hands over to the row under the pointer', async () => {
  const { share } = await openShare()
  const exit = { x: share.left + 60, y: share.bottom - 1 }
  mouse(row('Share'), 'mouseleave', exit.x, exit.y)
  // Straight down, away from the submenu: outside the triangle.
  const target = row('Move').getBoundingClientRect()
  const x = share.left + 20
  const y = target.top + target.height / 2
  mouse(row('Move'), 'mouseenter', x, y)
  move(x, y)
  await vi.waitFor(() => expect(expanded('Move')).toBe('true'))
  expect(expanded('Share')).toBe('false')
})
