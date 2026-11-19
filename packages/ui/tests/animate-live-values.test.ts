// Live values: a getter or ref in v-animate's `animate`, followed every frame without re-rendering,
// exactly or on a spring, and an exit that takes over carries on at the speed it was moving.
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef, withDirectives } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import { vAnimate } from '../src/motion/vAnimate'
import { mapRange } from '../src/motion/mapRange'
import { publishSpeed } from '../src/motion/velocity'

const frame = () => new Promise(requestAnimationFrame)

test('a ref is followed as it changes, with no render in between', async () => {
  const x = shallowRef(0)
  let renders = 0
  const Box = defineComponent(() => () => {
    renders++
    return withDirectives(h('div', { 'data-p': '' }), [
      [vAnimate, { animate: { x, opacity: 0.5 } }],
    ])
  })
  const screen = await render(Box)
  const el = screen.container.querySelector<HTMLElement>('[data-p]')!
  const before = renders
  x.value = 120
  // Synchronous: the style is there before any frame or render.
  expect(el.style.translate).toBe('120px')
  x.value = -40
  expect(el.style.translate).toBe('-40px')
  await nextTick()
  expect(renders).toBe(before)
})

test('an inline getter, new each render, keeps being followed', async () => {
  const source = shallowRef(10)
  const tick = shallowRef(0)
  const screen = await render(() =>
    withDirectives(h('div', { 'data-p': '', 'data-t': tick.value }), [
      [vAnimate, { animate: { rotate: () => source.value * 2 } }],
    ]),
  )
  const el = screen.container.querySelector<HTMLElement>('[data-p]')!
  expect(el.style.rotate).toBe('20deg')
  tick.value++
  await nextTick()
  source.value = 30
  expect(el.style.rotate).toBe('60deg')
})

test('{ value, spring } follows on the spring, through the values between', async () => {
  const scale = shallowRef(1)
  const screen = await render(() =>
    withDirectives(h('div', { 'data-p': '' }), [
      [vAnimate, { animate: { scale: { value: scale, spring: 'smooth' } } }],
    ]),
  )
  const el = screen.container.querySelector<HTMLElement>('[data-p]')!
  scale.value = 0.5
  await frame()
  await frame()
  const mid = Number(el.style.scale)
  expect(mid).toBeLessThan(1)
  expect(mid).toBeGreaterThan(0.5)
  await new Promise((resolve) => setTimeout(resolve, 900))
  expect(Number(el.style.scale)).toBeCloseTo(0.5, 2)
})

test('with motion off, a spring-followed value is there at once', async () => {
  const scale = shallowRef(1)
  const screen = await render(() =>
    h(ConfigProvider, { motion: false }, () =>
      withDirectives(h('div', { 'data-p': '' }), [
        [vAnimate, { animate: { scale: { value: scale, spring: 'smooth' } } }],
      ]),
    ),
  )
  const el = screen.container.querySelector<HTMLElement>('[data-p]')!
  scale.value = 0.5
  expect(el.style.scale).toBe('0.5')
})

test('a value no longer live, and in no look, goes back to the element’s own', async () => {
  const live = shallowRef(true)
  const x = shallowRef(80)
  const screen = await render(() =>
    withDirectives(h('div', { 'data-p': '' }), [[vAnimate, { animate: live.value ? { x } : {} }]]),
  )
  const el = screen.container.querySelector<HTMLElement>('[data-p]')!
  expect(el.style.translate).toBe('80px')
  live.value = false
  await nextTick()
  expect(el.style.translate).toBe('')
})

test('mapRange maps between stops and holds the ends', () => {
  expect(mapRange(150, [0, 300], [0, 30])).toBe(15)
  expect(mapRange(-50, [0, 300], [0, 30])).toBe(0)
  expect(mapRange(900, [0, 300], [0, 30])).toBe(30)
  expect(mapRange(-150, [-300, 0, 300], [-20, 0, 20])).toBe(-10)
  expect(mapRange(450, [0, 300, 600], [1, 1, 0])).toBe(0.5)
})

test('an exit on a spring starts at the speed the element was moving', async () => {
  const travelled = async (speed: number) => {
    const shown = shallowRef(true)
    const screen = await render(() =>
      h('div', { style: 'position: relative; height: 40px' }, [
        shown.value
          ? withDirectives(h('div', { 'data-p': '', style: 'width: 40px; height: 40px' }), [
              [vAnimate, { exit: { x: { value: 600, spring: 'smooth' } } }],
            ])
          : null,
      ]),
    )
    const el = screen.container.querySelector<HTMLElement>('[data-p]')!
    await new Promise((resolve) => setTimeout(resolve, 100))
    const stop = publishSpeed(el, () => ({ x: speed }))
    shown.value = false
    await nextTick()
    await new Promise(requestAnimationFrame)
    // Where the exit puts it 50 ms in, held there, so timing can't blur the comparison.
    const leaving = screen.container.querySelector<HTMLElement>('[data-p]')!
    for (const run of leaving.getAnimations()) {
      run.pause()
      run.currentTime = 50
    }
    const x = parseFloat(getComputedStyle(leaving).translate) || 0
    stop()
    screen.unmount()
    return x
  }
  const still = await travelled(0)
  const thrown = await travelled(4000)
  expect(thrown).toBeGreaterThan(still + 40)
})

test('a live value writes only its own CSS, so another writer (a drag) keeps the rest', async () => {
  const turn = shallowRef(0)
  const screen = await render(() =>
    withDirectives(h('div', { 'data-p': '' }), [
      [vAnimate, { animate: { rotate: turn, scale: { value: () => 1, spring: 'smooth' } } }],
    ]),
  )
  const el = screen.container.querySelector<HTMLElement>('[data-p]')!
  el.style.translate = '50px'
  turn.value = 10
  turn.value = 20
  await frame()
  expect(el.style.rotate).toBe('20deg')
  expect(el.style.translate).toBe('50px')
})

test('an entrance that ends puts back the live values, not the style it saved before them', async () => {
  const shown = shallowRef(false)
  const scale = shallowRef(0.8)
  const screen = await render(() =>
    h('div', [
      shown.value
        ? withDirectives(h('div', { 'data-p': '' }), [
            [
              vAnimate,
              {
                animate: { scale: { value: scale, spring: 'smooth' }, opacity: () => 0.6 },
                initial: { opacity: 0, x: 80 },
                duration: 200,
              },
            ],
          ])
        : null,
    ]),
  )
  shown.value = true
  await nextTick()
  scale.value = 0.7
  await new Promise((resolve) => setTimeout(resolve, 900))
  const el = screen.container.querySelector<HTMLElement>('[data-p]')!
  expect(Number(getComputedStyle(el).scale)).toBeCloseTo(0.7, 2)
  expect(getComputedStyle(el).opacity).toBe('0.6')
})

test('a leaving element with live size keeps that size as it fades', async () => {
  const show = shallowRef(true)
  const w = shallowRef(200)
  const screen = await render(() =>
    h('div', { style: 'position: relative; width: 400px; height: 300px' }, [
      show.value
        ? withDirectives(
            h('div', { 'data-band': '', style: 'position: absolute; inset: 0 auto auto 0' }),
            [
              [
                vAnimate,
                { animate: { width: w, height: () => 80 }, exit: { opacity: 0 }, duration: 600 },
              ],
            ],
          )
        : null,
    ]),
  )
  const el = screen.container.querySelector<HTMLElement>('[data-band]')!
  w.value = 260
  expect(el.style.width).toBe('260px')
  show.value = false
  await nextTick()
  await frame()
  // Still in the page and fading, at the size it had.
  expect(el.isConnected).toBe(true)
  expect(el.getBoundingClientRect().width).toBe(260)
  expect(el.getBoundingClientRect().height).toBe(80)
})
