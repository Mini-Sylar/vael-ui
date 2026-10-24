import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import Button from '../src/components/Button/Button.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Dialog from '../src/components/Dialog/Dialog.vue'

vi.mock('../src/composables/dom', async (original) => ({
  ...(await original<typeof import('../src/composables/dom')>()),
  prefersReducedMotion: () => true,
}))

const real = { global: { stubs: { transition: false } } }
const frame = () => new Promise(requestAnimationFrame)
const panel = () => document.querySelector<HTMLElement>('.ui-dialog-panel')

afterEach(() => {
  document.body.innerHTML = ''
})

async function opening(motion?: object) {
  const open = shallowRef(false)
  render(
    {
      setup: () => () =>
        h(Dialog as never, { open: open.value, title: 'Side', position: 'right', motion }),
    },
    real,
  )
  open.value = true
  const seen: { opacity: number; translate: string }[] = []
  for (let i = 0; i < 20; i++) {
    await frame()
    if (panel())
      seen.push({
        opacity: Number(getComputedStyle(panel()!).opacity),
        translate: getComputedStyle(panel()!).translate,
      })
  }
  return { open, seen }
}

test('a side drawer, whose look is a slide only, fades in instead of popping under reduced motion', async () => {
  const { open, seen } = await opening()
  expect(seen.some((f) => f.opacity > 0 && f.opacity < 1)).toBe(true)
  expect(seen.every((f) => f.translate === 'none')).toBe(true)
  open.value = false
  const leaving: number[] = []
  for (let i = 0; i < 20 && panel(); i++) {
    leaving.push(Number(getComputedStyle(panel()!).opacity))
    await frame()
  }
  expect(leaving.some((o) => o > 0 && o < 1)).toBe(true)
})

test('the same on the runtime engine (keyframes send it there)', async () => {
  const { seen } = await opening({ initial: { panel: { x: ['100%', '50%', '0%'] } } })
  expect(seen.some((f) => f.opacity > 0 && f.opacity < 1)).toBe(true)
  expect(seen.every((f) => f.translate === 'none')).toBe(true)
})

test('a state that only moves does nothing under reduced motion: it never fades the button', async () => {
  render({
    setup: () => () =>
      h(Button, { motion: { states: { active: { root: { scale: '0.9' } } } } }, () => 'Save'),
  })
  const button = () => document.querySelector<HTMLElement>('.ui-button')!
  await vi.waitFor(() => expect(button()).not.toBeNull())
  await new Promise((r) => setTimeout(r, 300))
  button().dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }),
  )
  for (let i = 0; i < 10; i++) await frame()
  expect(getComputedStyle(button()).opacity).toBe('1')
  window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
})

test('reduced motion: a linked page keeps its corners and colour, without moving', async () => {
  render(
    {
      setup: () => () => [
        h('div', { class: 'page' }, 'Page'),
        h(Dialog as never, {
          open: true,
          title: 'A',
          motion: {
            linked: {
              page: {
                el: () => document.querySelector('.page'),
                open: { scale: '0.9', borderRadius: '8px' },
              },
            },
          },
        }),
      ],
    },
    real,
  )
  const page = () => getComputedStyle(document.querySelector('.page')!)
  await vi.waitFor(() => expect(page().borderTopLeftRadius).toBe('8px'))
  expect(page().scale).toBe('none')
})

test('reduced motion: an engine gets the fade without the movement', async () => {
  const seen: Record<string, unknown>[] = []
  const engine = (el: HTMLElement, from: Record<string, unknown>) => {
    if (el.classList.contains('ui-dialog-panel')) seen.push(from)
  }
  const open = shallowRef(false)
  render(
    {
      setup: () => () =>
        h(ConfigProvider as never, { motion: { version: 1, engine } }, () =>
          h(Dialog as never, { open: open.value, title: 'Engine' }),
        ),
    },
    real,
  )
  open.value = true
  await vi.waitFor(() => expect(seen).toHaveLength(1))
  expect(seen[0]).toHaveProperty('opacity')
  expect(seen[0]).not.toHaveProperty('scale')
  expect(seen[0]).not.toHaveProperty('y')
})
