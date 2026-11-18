// usePanZoom: zoom keeps the point under the finger fixed, the content stays inside its box, and
// the gestures (pan, pinch, double tap, ctrl wheel, keys) do what they say.
import { effectScope, shallowRef } from 'vue'
import { afterEach, expect, test } from 'vitest'
import { usePanZoom } from '../src/composables/usePanZoom'
import type { UsePanZoomOptions, UsePanZoomReturn } from '../src/composables/usePanZoom'

const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop())
  document.body.replaceChildren()
})

function setup(options: Partial<UsePanZoomOptions> = {}, content = { w: 200, h: 100 }) {
  const el = document.createElement('div')
  el.style.cssText = 'width: 200px; height: 100px; position: relative; overflow: hidden'
  const inner = document.createElement('div')
  inner.style.cssText = `width: ${content.w}px; height: ${content.h}px`
  el.append(inner)
  document.body.append(el)
  let pz!: UsePanZoomReturn
  const scope = effectScope()
  scopes.push(scope)
  scope.run(() => (pz = usePanZoom({ el: shallowRef(el), ...options })))
  return { el, inner, pz }
}
const pt = (id: number, el: Element, type: string, x: number, y: number) => {
  const r = el.getBoundingClientRect()
  return new PointerEvent(type, {
    pointerId: id,
    clientX: r.left + x,
    clientY: r.top + y,
    button: 0,
    bubbles: true,
    cancelable: true,
  })
}
const down = (el: Element, id: number, x: number, y: number) =>
  el.dispatchEvent(pt(id, el, 'pointerdown', x, y))
const move = (el: Element, id: number, x: number, y: number) =>
  window.dispatchEvent(pt(id, el, 'pointermove', x, y))
const up = (el: Element, id: number, x: number, y: number) =>
  window.dispatchEvent(pt(id, el, 'pointerup', x, y))
const rest = () => new Promise((resolve) => setTimeout(resolve, 900))

test('zooming around a point keeps that point of the content where it is', () => {
  const { pz, inner } = setup()
  const before = { x: 50, y: 30 }
  // The content point under (50, 30) at scale 1 is itself; at scale 2 it must still be at (50, 30).
  pz.zoomTo(2, { at: before, animate: false })
  expect(pz.scale.value).toBe(2)
  const r = inner.getBoundingClientRect()
  const host = inner.parentElement!.getBoundingClientRect()
  expect(Math.round((50 * 2 + (r.left - host.left)) * 100) / 100).toBe(50)
  expect(pz.x.value).toBe(-50)
  expect(pz.y.value).toBe(-30)
  expect(pz.isZoomed.value).toBe(true)
})

test('the scale stays between the limits', () => {
  const { pz } = setup({ minScale: 1, maxScale: 3 })
  pz.zoomTo(9, { animate: false })
  expect(pz.scale.value).toBe(3)
  pz.zoomTo(0.2, { animate: false })
  expect(pz.scale.value).toBe(1)
})

test('the content cannot be moved out of its box', () => {
  const { pz } = setup()
  pz.zoomTo(2, { animate: false })
  // Content is 400 x 200 in a 200 x 100 box: at most 200 px and 100 px of travel.
  pz.panBy({ x: 5000, y: 5000 }, { animate: false })
  expect([pz.x.value + 0, pz.y.value + 0]).toEqual([0, 0])
  pz.panBy({ x: -5000, y: -5000 }, { animate: false })
  expect([pz.x.value, pz.y.value]).toEqual([-200, -100])
})

test('content smaller than its box is centred at every scale', () => {
  const { pz } = setup({ minScale: 0.5 }, { w: 100, h: 50 })
  // 100 x 50 in 200 x 100: at its own size it sits in the middle.
  pz.zoomTo(1, { animate: false })
  expect([pz.x.value, pz.y.value]).toEqual([50, 25])
  // Reset is the smallest scale, 0.5: 50 x 25 shown, still centred.
  pz.reset({ animate: false })
  expect(pz.scale.value).toBe(0.5)
  expect([pz.x.value, pz.y.value]).toEqual([75, 37.5])
})

test('reset returns to the smallest scale, centred', () => {
  const { pz } = setup()
  pz.zoomTo(3, { animate: false })
  pz.panBy({ x: -80, y: -40 }, { animate: false })
  pz.reset({ animate: false })
  expect([pz.x.value, pz.y.value, pz.scale.value]).toEqual([0, 0, 1])
  expect(pz.isZoomed.value).toBe(false)
})

test('it moves the content by translate and scale, from its top left', () => {
  const { pz, inner } = setup()
  pz.zoomTo(2, { animate: false })
  expect(inner.style.scale).toBe('2')
  expect(inner.style.transformOrigin).toBe('0px 0px')
  pz.reset({ animate: false })
  expect(inner.style.scale).toBe('')
  expect(inner.style.translate).toBe('')
})

test('one finger pans a zoomed content, and does not move one that fits', () => {
  const { el, pz } = setup()
  down(el, 1, 100, 50)
  for (let i = 1; i <= 20; i++) move(el, 1, 100 + i * 3, 50)
  up(el, 1, 160, 50)
  expect(pz.x.value).toBe(0)
  pz.zoomTo(2, { animate: false })
  down(el, 2, 100, 50)
  for (let i = 1; i <= 25; i++) move(el, 2, 100 - i * 3, 50)
  expect(pz.x.value).toBeLessThan(-50)
  expect(pz.isDragging.value).toBe(true)
  up(el, 2, 25, 50)
  expect(pz.isDragging.value).toBe(false)
})

test('two fingers pinch: apart zooms in around their centre, and the centre stays under them', () => {
  const { el, pz } = setup({ maxScale: 4 })
  down(el, 1, 90, 50)
  down(el, 2, 110, 50)
  expect(pz.isDragging.value).toBe(true)
  // Apart to 4x the distance, centre unmoved at (100, 50).
  for (let i = 1; i <= 10; i++) {
    move(el, 1, 90 - i * 3.5, 50)
    move(el, 2, 110 + i * 3.5, 50)
  }
  expect(pz.scale.value).toBeGreaterThan(3)
  // The content point that was under (100, 50) is still under it.
  expect(Math.round(pz.x.value + pz.scale.value * 100)).toBe(100)
  up(el, 2, 145, 50)
  up(el, 1, 55, 50)
})

test('a pinch past the largest scale gives, and lands on the limit when let go', async () => {
  const { el, pz } = setup({ maxScale: 2 })
  down(el, 1, 95, 50)
  down(el, 2, 105, 50)
  for (let i = 1; i <= 10; i++) {
    move(el, 1, 95 - i * 8, 50)
    move(el, 2, 105 + i * 8, 50)
  }
  expect(pz.scale.value).toBeGreaterThan(2)
  expect(pz.scale.value).toBeLessThan(4)
  up(el, 2, 185, 50)
  up(el, 1, 15, 50)
  await rest()
  expect(Math.round(pz.scale.value * 100) / 100).toBe(2)
})

test('a double tap zooms in around it, and a second one zooms back out', async () => {
  const { el, pz } = setup({ doubleTapScale: 2 })
  const tap = () => {
    down(el, 1, 60, 40)
    up(el, 1, 60, 40)
  }
  tap()
  tap()
  await rest()
  expect(Math.round(pz.scale.value * 100) / 100).toBe(2)
  // The point tapped stays under the finger.
  expect(Math.round(pz.x.value)).toBe(-60)
  tap()
  tap()
  await rest()
  expect(Math.round(pz.scale.value * 100) / 100).toBe(1)
})

test('ctrl and the wheel zooms around the cursor; a plain wheel is left to the page', () => {
  const { el, pz } = setup({ maxScale: 4 })
  const plain = new WheelEvent('wheel', { deltaY: -100, cancelable: true, bubbles: true })
  el.dispatchEvent(plain)
  expect(plain.defaultPrevented).toBe(false)
  expect(pz.scale.value).toBe(1)
  const r = el.getBoundingClientRect()
  const zoom = new WheelEvent('wheel', {
    deltaY: -100,
    ctrlKey: true,
    clientX: r.left + 150,
    clientY: r.top + 40,
    cancelable: true,
    bubbles: true,
  })
  el.dispatchEvent(zoom)
  expect(zoom.defaultPrevented).toBe(true)
  expect(pz.scale.value).toBeGreaterThan(2)
  // Under the cursor at (150, 40) is still the content point that was there at scale 1 (150, 40).
  expect(Math.round(pz.x.value + pz.scale.value * 150)).toBe(150)
  expect(Math.round(pz.y.value + pz.scale.value * 40)).toBe(40)
})

test('the keys zoom, pan and reset, and leave other keys alone', async () => {
  const { pz } = setup()
  const key = (k: string) => {
    const event = new KeyboardEvent('keydown', { key: k, cancelable: true })
    pz.onKeydown(event)
    return event.defaultPrevented
  }
  expect(key('a')).toBe(false)
  expect(key('+')).toBe(true)
  await rest()
  expect(pz.isZoomed.value).toBe(true)
  expect(key('0')).toBe(true)
  await rest()
  expect(pz.isZoomed.value).toBe(false)
})

test('Escape mid-pan puts it back where the gesture began', async () => {
  const { el, pz } = setup()
  pz.zoomTo(2, { animate: false })
  down(el, 1, 100, 50)
  for (let i = 1; i <= 25; i++) move(el, 1, 100 - i * 3, 50)
  expect(pz.x.value).toBeLessThan(-50)
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
  )
  await rest()
  // Back where it began: zoomed to 2 around the centre, at x = -100.
  expect(Math.round(pz.x.value)).toBe(-100)
  expect(pz.isDragging.value).toBe(false)
})

test('an svg works as the content, panned inside its own size', () => {
  const el = document.createElement('div')
  el.style.cssText = 'width: 200px; height: 100px; position: relative; overflow: hidden'
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.style.cssText = 'display: block; width: 100%; height: 100%'
  el.append(svg)
  document.body.append(el)
  let pz!: UsePanZoomReturn
  const scope = effectScope()
  scopes.push(scope)
  scope.run(() => (pz = usePanZoom({ el: shallowRef(el) })))
  pz.zoomTo(2, { animate: false })
  pz.panBy({ x: -5000, y: -5000 }, { animate: false })
  expect([pz.x.value, pz.y.value]).toEqual([-200, -100])
  expect(svg.style.scale).toBe('2')
})
