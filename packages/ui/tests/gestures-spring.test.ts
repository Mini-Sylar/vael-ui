// One source for the spring: useWheel and useDrag settle on the one you name, else the
// ConfigProvider's, else `smooth`.
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef, useTemplateRef } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import { gestureSprings, limitOvershoot } from '../src/composables/gesture'
import { useWheel } from '../src/composables/useWheel'
import type { UseWheelReturn } from '../src/composables/useWheel'
import type { Spring } from '../src/motion/types'
import type { SpringName } from '../src/motion/springNames'

test('gestureSprings: a named spring, with give only for a throw and none under reduced motion', () => {
  const named = gestureSprings(null, 'bouncy')
  expect(named.settle).toEqual({ damping: 0.55, response: 0.45 })
  expect(named.thrown.damping).toBeLessThan(1)
  expect(named.reduced.damping).toBe(1)
  // The app's own spring is used as given for a button or a key.
  expect(gestureSprings(null, { damping: 0.7, response: 0.3 }).settle).toEqual({
    damping: 0.7,
    response: 0.3,
  })
  // A hand's release has some give, but a very bouncy app spring never flings it.
  expect(gestureSprings(null, { damping: 0.3, response: 0.5 }).thrown.damping).toBe(0.5)
  expect(gestureSprings(null, { damping: 0.55, response: 0.5 }).thrown.damping).toBe(0.55)
  expect(gestureSprings(null).settle.response).toBe(0.32)
})

async function distanceAfter(provider: Spring | undefined, own: Spring | SpringName | undefined) {
  let wheel!: UseWheelReturn
  const model = shallowRef(0)
  const Picker = defineComponent(() => {
    const el = useTemplateRef<HTMLElement>('el')
    wheel = useWheel(model, { el, count: 10, size: 36, spring: own })
    return () =>
      h(
        'div',
        { ref: 'el' },
        Array.from({ length: 10 }, (_, i) => h('div', i)),
      )
  })
  await render(() =>
    h(ConfigProvider, provider ? { motion: { spring: provider } } : {}, () => h(Picker)),
  )
  await nextTick()
  wheel.goTo(8)
  await new Promise((resolve) => setTimeout(resolve, 150))
  return wheel.position.value
}

test('useWheel follows the ConfigProvider’s spring, and its own overrides it', async () => {
  const normal = await distanceAfter(undefined, undefined)
  const slow = await distanceAfter({ damping: 1, response: 1.4 }, undefined)
  const own = await distanceAfter({ damping: 1, response: 1.4 }, 'snappy')
  expect(slow).toBeLessThan(normal - 0.5)
  expect(own).toBeGreaterThan(slow + 0.5)
})

test('a pull past the end of a list returns quickly and with no bounce', () => {
  const sprites = gestureSprings(null)
  expect(sprites.end.damping).toBe(1)
  expect(sprites.end.response).toBeLessThanOrEqual(sprites.settle.response!)
  // The card going home keeps only a little give, less than a throw's.
  expect(sprites.home.damping).toBeGreaterThan(sprites.thrown.damping!)
})

test('limitOvershoot lowers a speed that would swing too far out, and leaves a gentle one', () => {
  const peak = (past: number, speed: number, response: number) => {
    const w = (2 * Math.PI) / response
    let m = Math.max(past, 0)
    for (let t = 0; t < 2; t += 0.004)
      m = Math.max(m, (past + (speed + w * past) * t) * Math.exp(-w * t))
    return m
  }
  // Thrown hard at an end 10 px away: it may swing out 18 px at most.
  const limited = limitOvershoot(-10, 6000, 0.25, 18)
  expect(limited).toBeLessThan(6000)
  expect(peak(-10, limited, 0.25)).toBeLessThanOrEqual(18.5)
  // A gentle one is left alone.
  expect(limitOvershoot(-30, 20, 0.25, 18)).toBe(20)
  // Already beyond the limit: no more outward speed than lets it come straight back.
  expect(peak(40, limitOvershoot(40, 3000, 0.25, 18), 0.25)).toBeCloseTo(40, 0)
})
