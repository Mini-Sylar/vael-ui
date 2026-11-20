// useWheel's ticks: a click for each row that passes, one for the row it lands on, none for a bounce.
import { effectScope, nextTick, shallowRef, watchEffect } from 'vue'
import { afterEach, expect, test } from 'vitest'
import { useWheel } from '../src/composables/useWheel'
import type { UseWheelOptions, UseWheelReturn } from '../src/composables/useWheel'

const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()))

function setup(start: number, options: Partial<UseWheelOptions> = {}) {
  const el = document.createElement('div')
  for (let i = 0; i < 24; i++) el.append(document.createElement('div'))
  document.body.append(el)
  const model = shallowRef(start)
  const ticks: number[] = []
  let wheel!: UseWheelReturn
  const settled = new Promise<number>((resolve) => {
    const scope = effectScope()
    scopes.push(scope)
    scope.run(() => {
      wheel = useWheel(model, {
        el: shallowRef(el),
        count: 24,
        size: 36,
        onTick: (i) => ticks.push(i),
        onSettle: resolve,
        ...options,
      })
    })
  })
  return { el, model, ticks, settled, wheel }
}

test('going to a row ticks each row on the way, ending on the one it lands on', async () => {
  const { ticks, settled, wheel } = setup(0)
  wheel.goTo(4)
  expect(await settled).toBe(4)
  expect(ticks).toEqual([1, 2, 3, 4])
})

test('a looping wheel takes the short way round, and ticks wrapped rows', async () => {
  const { ticks, settled, wheel } = setup(1, { loop: true })
  wheel.goTo(22)
  expect(await settled).toBe(22)
  expect(ticks).toEqual([0, 23, 22])
})

test('stepping one row ticks once', async () => {
  const { ticks, settled, wheel } = setup(10)
  wheel.step(1)
  await settled
  expect(ticks).toEqual([11])
})

test('going to the row it is already on does not tick', async () => {
  const { ticks, settled, wheel } = setup(5)
  wheel.goTo(5)
  await settled
  expect(ticks).toEqual([])
})

test('a list that does not loop clamps goTo and never ticks past its ends', async () => {
  const { ticks, settled, wheel } = setup(21)
  wheel.goTo(40)
  expect(await settled).toBe(23)
  expect(ticks).toEqual([22, 23])
})

test('the rows near the centre are given their distance from it', async () => {
  const { el, settled, wheel } = setup(3)
  wheel.goTo(3, { animate: false })
  await settled
  const offset = (i: number) =>
    (el.children[i] as HTMLElement).style.getPropertyValue('--ui-wheel-offset')
  expect(offset(3)).toBe('0')
  expect(offset(4)).toBe('1')
  expect(offset(2)).toBe('-1')
  // Past the reach the row is never written (the stylesheet's default hides it).
  expect(offset(20)).toBe('')
})

test('a getter that reads progressOf follows every frame, as v-animate needs', async () => {
  const { settled, wheel } = setup(0)
  const seen: number[] = []
  const scope = effectScope()
  scopes.push(scope)
  scope.run(() => watchEffect(() => seen.push(wheel.progressOf(2))))
  wheel.goTo(2)
  await settled
  // Many frames between rest at row 0 (row 2 is 2 rows off: 5/6) and rest on it (1/2).
  expect(seen.length).toBeGreaterThan(5)
  expect(seen[0]).toBeCloseTo(5 / 6, 5)
  expect(seen.at(-1)).toBeCloseTo(0.5, 5)
})

test('when the count changes it stays on its item, and clamps when its item is gone', async () => {
  const el = document.createElement('div')
  for (let i = 0; i < 24; i++) el.append(document.createElement('div'))
  document.body.append(el)
  const model = shallowRef(10)
  const count = shallowRef(24)
  let wheel!: UseWheelReturn
  const scope = effectScope()
  scopes.push(scope)
  scope.run(() => (wheel = useWheel(model, { el: shallowRef(el), count, size: 36 })))
  count.value = 30
  await nextTick()
  expect(wheel.position.value).toBe(10)
  count.value = 5
  await nextTick()
  expect(wheel.index.value).toBe(4)
  expect(wheel.position.value).toBe(4)
})

test('a vertical mouse wheel over a horizontal wheel is left to the page', async () => {
  const { el, wheel } = setup(3, { orientation: 'horizontal' })
  const down = new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true })
  el.dispatchEvent(down)
  expect(down.defaultPrevented).toBe(false)
  expect(wheel.position.value).toBe(3)
  // A new gesture, once the last one has gone quiet.
  await new Promise((resolve) => setTimeout(resolve, 200))
  const across = new WheelEvent('wheel', { deltaX: 120, cancelable: true, bubbles: true })
  el.dispatchEvent(across)
  expect(across.defaultPrevented).toBe(true)
  expect(wheel.position.value).toBeGreaterThan(3)
})

test('at an end, pushing further on is left to the page', () => {
  const { el } = setup(0)
  const up = new WheelEvent('wheel', { deltaY: -120, cancelable: true, bubbles: true })
  el.dispatchEvent(up)
  expect(up.defaultPrevented).toBe(false)
})

test('the keys step along the axis, and leave the other axis alone', async () => {
  const { el, wheel, settled } = setup(5)
  const key = (k: string) => {
    const e = new KeyboardEvent('keydown', { key: k, cancelable: true })
    wheel.onKeydown(e)
    return e.defaultPrevented
  }
  expect(key('ArrowLeft')).toBe(false)
  expect(key('ArrowDown')).toBe(true)
  expect(await settled).toBe(6)
  void el
})

test('the model changes as soon as the item is chosen, not when the spring rests', async () => {
  const { model, settled, wheel } = setup(2)
  wheel.goTo(7)
  // Chosen, still moving.
  expect(model.value).toBe(7)
  expect(wheel.position.value).toBeLessThan(7)
  expect(await settled).toBe(7)
})

test('a wheel gesture stays the wheel’s: a sideways or empty event inside it never scrolls the page', () => {
  const { el, wheel } = setup(5, { loop: true })
  const send = (deltaX: number, deltaY: number) => {
    const event = new WheelEvent('wheel', { deltaX, deltaY, cancelable: true, bubbles: true })
    el.dispatchEvent(event)
    return event.defaultPrevented
  }
  // A trackpad: mostly vertical, with a sideways twitch and an empty event part way.
  expect([send(1, 30), send(6, 2), send(0, 0), send(2, 25)]).toEqual([true, true, true, true])
  expect(wheel.position.value).toBeGreaterThan(5)
})
