// v-animate's `states`: hover (a mouse), press (pointer, Space or Enter) and focus on any element.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'
import { trackResources } from './utils/resources'

afterEach(() => {
  document.body.innerHTML = ''
})

const scaleOf = (el: Element) => {
  const s = getComputedStyle(el).scale
  return s === 'none' ? 1 : Number(s.split(' ')[0])
}
const settle = async (el: Element) => {
  await vi.waitFor(() =>
    expect(el.getAnimations().every((a) => a.playState !== 'running')).toBe(true),
  )
}
// Out of the real cursor's reach: an earlier test file can leave the mouse resting where this card
// appears, and Chrome then hovers it for real. These tests dispatch their own pointer events.
const card = (states: Record<string, object>) => {
  const look = shallowRef(states)
  render(() =>
    withDirectives(h('button', { class: 'card', style: 'pointer-events: none' }, 'Card'), [
      [vAnimate, { states: look.value }],
    ]),
  )
  return { el: () => document.querySelector<HTMLElement>('.card')!, look }
}
const pointer = (el: Element, type: string, pointerType = 'mouse') =>
  el.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerType }))

test('a mouse hover holds its look, and leaving lets it go', async () => {
  const { el } = card({ hover: { scale: 1.1 } })
  await new Promise((r) => setTimeout(r, 200))
  pointer(el(), 'pointerenter')
  await vi.waitFor(() => expect(scaleOf(el())).toBeGreaterThan(1.05))
  pointer(el(), 'pointerleave')
  await settle(el())
  expect(scaleOf(el())).toBe(1)
})

test('touch never hovers', async () => {
  const { el } = card({ hover: { scale: 1.1 } })
  await new Promise((r) => setTimeout(r, 200))
  pointer(el(), 'pointerenter', 'touch')
  await new Promise((r) => setTimeout(r, 300))
  expect(scaleOf(el())).toBe(1)
})

test('a press by pointer or by Space holds `active`', async () => {
  const { el } = card({ active: { scale: 0.9 } })
  await new Promise((r) => setTimeout(r, 200))
  pointer(el(), 'pointerdown')
  await vi.waitFor(() => expect(scaleOf(el())).toBeLessThan(0.95))
  window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
  await settle(el())
  expect(scaleOf(el())).toBe(1)
  el().dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
  await vi.waitFor(() => expect(scaleOf(el())).toBeLessThan(0.95))
  el().dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }))
  await settle(el())
  expect(scaleOf(el())).toBe(1)
})

test('a changed look applies while hovered', async () => {
  const { el, look } = card({ hover: { scale: 1.1 } })
  await new Promise((r) => setTimeout(r, 200))
  pointer(el(), 'pointerenter')
  await vi.waitFor(() => expect(scaleOf(el())).toBeGreaterThan(1.05))
  look.value = { hover: { scale: 1.3 } }
  await vi.waitFor(() => expect(scaleOf(el())).toBeGreaterThan(1.25))
})

test('nothing is left listening once it unmounts', async () => {
  const tracker = trackResources()
  const show = shallowRef(true)
  render(() =>
    show.value
      ? withDirectives(h('button', { class: 'card' }, 'Card'), [
          [vAnimate, { states: { hover: { scale: 1.1 }, active: { scale: 0.9 } } }],
        ])
      : null,
  )
  await new Promise((r) => setTimeout(r, 200))
  show.value = false
  await new Promise((r) => setTimeout(r, 100))
  try {
    expect(tracker.snapshot().listeners).toEqual([])
  } finally {
    tracker.restore()
  }
})
