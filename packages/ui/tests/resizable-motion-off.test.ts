// Resizable: `motion: false` stops its settle transition; edge autoscroll keeps one speed at any refresh rate.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { effectScope, h, shallowRef } from 'vue'
import Resizable from '../src/components/Resizable/Resizable.vue'
import { useResizable } from '../src/composables/useResizable'

afterEach(() => vi.unstubAllGlobals())

test('motion: false: a size from outside lands at once', async () => {
  const screen = await render(() =>
    h(Resizable as never, { modelValue: 200, motion: false }, () => 'Panel'),
  )
  const root = screen.container.querySelector<HTMLElement>('.ui-resizable')!
  expect(getComputedStyle(root).transitionProperty).toBe('none')
})

test('edge autoscroll moves per 60 Hz frame, so 120 Hz scrolls no faster', async () => {
  const box = document.createElement('div')
  box.style.cssText = 'width: 300px; height: 40px; overflow: auto; position: fixed; left: 0; top: 0'
  box.innerHTML = '<div style="width: 3000px; height: 10px"></div>'
  document.body.append(box)
  const queue: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => queue.push(fn))
  vi.stubGlobal('cancelAnimationFrame', () => {})
  const scope = effectScope()
  const resize = scope.run(() =>
    useResizable(shallowRef(100), { scrollEl: box, bounds: [0, 5000], min: 20 }),
  )!
  const el = document.createElement('div')
  document.body.append(el)
  el.addEventListener('pointerdown', resize.onHandlePointerdown as EventListener)
  const pointerId = 1
  el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, pointerId, bubbles: true }))
  window.dispatchEvent(new PointerEvent('pointermove', { clientX: 295, pointerId, bubbles: true }))
  const steps: number[] = []
  for (let i = 0; i < 5; i++) {
    const before = box.scrollLeft
    queue.shift()!(1000 + i * (1000 / 120))
    steps.push(box.scrollLeft - before)
  }
  // The first frame moves a whole 60 Hz step; each 120 Hz frame after it half that.
  for (const step of steps.slice(1)) expect(step).toBeCloseTo(steps[0]! / 2, 0)
  window.dispatchEvent(new PointerEvent('pointerup', { clientX: 295, pointerId, bubbles: true }))
  scope.stop()
  box.remove()
})
