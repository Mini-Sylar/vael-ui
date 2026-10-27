import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import { animate, useAnimate } from '../src/motion/animate'

const MS = 300
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
afterEach(() => {
  document.body.innerHTML = ''
})

function box(cls = 'box') {
  const el = document.createElement('div')
  el.className = cls
  el.style.cssText = 'width: 40px; height: 40px'
  document.body.append(el)
  return el
}
const shownX = (el: HTMLElement) =>
  Number.parseFloat(getComputedStyle(el).translate.split(' ')[0]!) || 0

test('it moves from where it is to the values, and the end stays as its own style', async () => {
  const el = box()
  const start = performance.now()
  await animate(el, { x: 100, opacity: 0.5 }, { duration: MS })
  expect(performance.now() - start).toBeGreaterThanOrEqual(MS - 40)
  expect(el.style.translate).toBe('100px')
  expect(el.style.opacity).toBe('0.5')
  expect(el.getAnimations()).toHaveLength(0)
})

test('keyframes repeat with a pause between runs, counted by onRepeat', async () => {
  const el = box()
  const counts: number[] = []
  const start = performance.now()
  await animate(
    el,
    { x: [0, 20, 0] },
    { duration: 100, repeat: 2, repeatDelay: 0.1, onRepeat: (n) => counts.push(n) },
  )
  expect(performance.now() - start).toBeGreaterThanOrEqual(460)
  expect(counts).toEqual([1, 2])
})

test('a new call mid-way carries on from where the last one is', async () => {
  const el = box()
  void animate(el, { x: 100 }, { duration: 400, easing: 'linear' })
  await wait(200)
  const mid = shownX(el)
  expect(mid).toBeGreaterThan(20)
  expect(mid).toBeLessThan(80)
  void animate(el, { x: 0 }, { duration: 400, easing: 'linear' })
  await wait(20)
  // No jump back to 100 or forward to 0: it turns around from where it was.
  expect(Math.abs(shownX(el) - mid)).toBeLessThan(15)
})

test('pause holds it, time seeks it, speed changes its pace, stop leaves it there', async () => {
  const el = box()
  const run = animate(el, { x: 100 }, { duration: 400, easing: 'linear' })
  await wait(100)
  run.pause()
  // A pause lands on the next frame.
  await new Promise(requestAnimationFrame)
  const held = shownX(el)
  await wait(150)
  expect(shownX(el)).toBeCloseTo(held, 0)
  run.time = 300
  await wait(20)
  expect(shownX(el)).toBeCloseTo(75, 0)
  run.speed = 2
  expect(run.speed).toBe(2)
  run.stop()
  await run
  await wait(100)
  expect(shownX(el)).toBeCloseTo(75, 0)
})

test('with motion off it jumps to the end and resolves at once', async () => {
  render(() => h(ConfigProvider, { motion: false }, () => h('div', { class: 'inside' }, 'Hi')))
  await nextTick()
  const el = document.querySelector<HTMLElement>('.inside')!
  const start = performance.now()
  await animate(el, { x: 50 }, { duration: MS })
  expect(performance.now() - start).toBeLessThan(MS / 2)
  expect(el.style.translate).toBe('50px')
})

test('a selector animates every match, one after another with a stagger', async () => {
  box('item')
  box('item')
  const run = animate('.item', { x: 30 }, { duration: 200, stagger: 0.1, easing: 'linear' })
  await wait(120)
  const [a, b] = [...document.querySelectorAll<HTMLElement>('.item')]
  expect(shownX(a!)).toBeGreaterThan(shownX(b!) + 5)
  await run
})

test('useAnimate scopes selectors to its element and stops its runs on unmount', async () => {
  const outside = box('dot')
  let api: ReturnType<typeof useAnimate> | undefined
  const shown = shallowRef(true)
  const Panel = defineComponent({
    setup() {
      api = useAnimate()
      const { scope } = api
      return () => h('div', { ref: scope }, [h('span', { class: 'dot', style: 'display: block' })])
    },
  })
  render(() => (shown.value ? h(Panel) : null))
  await nextTick()
  const run = api!.animate('.dot', { x: 40 }, { duration: 2000 })
  await wait(100)
  const inside = document.querySelector<HTMLElement>('div > span.dot')!
  expect(shownX(inside)).toBeGreaterThan(0)
  expect(shownX(outside)).toBe(0)
  shown.value = false
  await nextTick()
  await run
})

test('useAnimate takes a template ref as its scope', async () => {
  const { defineComponent, h: hh, useTemplateRef } = await import('vue')
  const { useAnimate } = await import('../src/motion/animate')
  let played: Promise<unknown> | undefined
  const Row = defineComponent({
    setup() {
      const { animate } = useAnimate(useTemplateRef('row'))
      return () =>
        hh('div', { ref: 'row' }, [
          hh(
            'span',
            {
              class: 'hit',
              onClick: () =>
                (played = animate('.hit', { opacity: [1, 0.5, 1] }, { duration: 200 }).finished),
            },
            'In',
          ),
        ])
    },
  })
  const { render: mount } = await import('vitest-browser-vue')
  const screen = await mount(Row)
  // Outside the row, the same class isn't touched.
  const outside = document.createElement('span')
  outside.className = 'hit'
  document.body.append(outside)
  screen.container.querySelector<HTMLElement>('.hit')!.click()
  await vi.waitFor(() =>
    expect(screen.container.querySelector('.hit')!.getAnimations().length).toBeGreaterThan(0),
  )
  expect(outside.getAnimations()).toHaveLength(0)
  await played
  outside.remove()
})
