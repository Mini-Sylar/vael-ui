import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import BottomSheet from '../src/components/BottomSheet/BottomSheet.vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import Drawer from '../src/components/Drawer/Drawer.vue'

const real = { global: { stubs: { transition: false } } }
const frame = () => new Promise(requestAnimationFrame)
const page = () => document.querySelector<HTMLElement>('.page')!
const scale = () => getComputedStyle(page()).scale
const scaleOf = () => (scale() === 'none' ? 1 : Number(scale()))
const linkedRuns = () =>
  page()
    .getAnimations()
    .filter((a) => a.id === 'ui-linked')

afterEach(() => {
  document.body.innerHTML = ''
})

const recede = (to: string) => ({
  linked: {
    page: { el: page, open: { scale: to, borderRadius: '8px' } },
  },
})

test("a drawer's page recedes while it's open, on the drawer's curve, and comes back as it closes", async () => {
  const open = shallowRef(false)
  render(
    {
      setup: () => () => [
        h('div', { class: 'page' }, 'Page'),
        h(Drawer as never, {
          open: open.value,
          'onUpdate:open': (v: boolean) => (open.value = v),
          title: 'Settings',
          motion: recede('0.9'),
        }),
      ],
    },
    real,
  )
  await frame()
  expect(scale()).toBe('none')
  open.value = true
  // On its way, not there at once.
  const seen: number[] = []
  while (scale() !== '0.9' && seen.length < 120) {
    await frame()
    seen.push(scaleOf())
  }
  expect(scale()).toBe('0.9')
  expect(seen.filter((v) => v > 0.905 && v < 0.995).length).toBeGreaterThan(3)
  expect(getComputedStyle(page()).borderTopLeftRadius).toBe('8px')

  open.value = false
  // Back from where it is: early frames are still near 0.9, not at 1 and easing away from it.
  await frame()
  await frame()
  expect(scaleOf()).toBeLessThan(0.95)
  await vi.waitFor(() => expect(linkedRuns()).toHaveLength(0), { timeout: 2000 })
  expect(scale()).toBe('none')
  expect(getComputedStyle(page()).borderTopLeftRadius).toBe('0px')
})

test('movement runs apart from the border radius, so it stays on the compositor', async () => {
  render(
    {
      setup: () => () => [
        h('div', { class: 'page' }, 'Page'),
        h(Dialog as never, { open: true, title: 'A', motion: recede('0.9') }),
      ],
    },
    real,
  )
  await vi.waitFor(() => expect(linkedRuns()).toHaveLength(2))
  const keys = linkedRuns().map((run) =>
    Object.keys((run.effect as KeyframeEffect).getKeyframes()[1]!).filter(
      (k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k),
    ),
  )
  expect(keys).toEqual([['scale'], ['borderRadius']])
})

test('two overlays on one page: closing the top one hands it back to the one under it', async () => {
  const a = shallowRef(true)
  const b = shallowRef(false)
  render(
    {
      setup: () => () => [
        h('div', { class: 'page' }, 'Page'),
        h(Dialog as never, { open: a.value, title: 'A', motion: recede('0.95') }),
        h(Dialog as never, { open: b.value, title: 'B', motion: recede('0.9') }),
      ],
    },
    real,
  )
  await vi.waitFor(() => expect(scale()).toBe('0.95'))
  b.value = true
  await vi.waitFor(() => expect(scale()).toBe('0.9'))
  b.value = false
  await vi.waitFor(() => expect(scale()).toBe('0.95'))
  a.value = false
  await vi.waitFor(() => expect(scale()).toBe('none'), { timeout: 2000 })
})

test('a closed sheet leaves the page alone; dragging it brings the page back with the finger', async () => {
  const open = shallowRef(false)
  render(
    {
      setup: () => () => [
        h('div', { class: 'page' }, 'Page'),
        h(BottomSheet as never, {
          open: open.value,
          'onUpdate:open': (v: boolean) => (open.value = v),
          'aria-label': 'Share',
          snapPoints: [{ id: 'half', height: 0.5 }],
          motion: recede('0.9'),
        }),
      ],
    },
    real,
  )
  // Force-mounted: it runs an enter while closed, which must not move the page.
  for (let i = 0; i < 10; i++) await frame()
  expect(scale()).toBe('none')

  open.value = true
  await vi.waitFor(() => expect(scale()).toBe('0.9'))
  const handle = document.querySelector<HTMLElement>('.ui-bottom-sheet-handle-zone')!
  const startY = handle.getBoundingClientRect().top + 5
  const pointerId = 1
  handle.dispatchEvent(
    new PointerEvent('pointerdown', { clientY: startY, pointerId, bubbles: true }),
  )
  await new Promise((r) => setTimeout(r, 100))
  // A quarter of the showing height down: a quarter of the way back.
  const quarter = window.innerHeight * 0.5 * 0.25
  handle.dispatchEvent(
    new PointerEvent('pointermove', { clientY: startY + quarter, pointerId, bubbles: true }),
  )
  await frame()
  expect(scaleOf()).toBeCloseTo(0.925, 2)
  await new Promise((r) => setTimeout(r, 300))
  handle.dispatchEvent(
    new PointerEvent('pointerup', { clientY: startY + quarter, pointerId, bubbles: true }),
  )
  // Not far enough to close: it settles, and the page goes back to receding.
  await vi.waitFor(() => expect(scale()).toBe('0.9'))
  expect(open.value).toBe(true)
})
