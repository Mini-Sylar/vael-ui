// The motion API's last gaps: springs inside keyframes, stagger on components, delayed layout
// slides, `appear: 'later'`, `after` on its own, and loops that change speed without restarting.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef, withDirectives } from 'vue'
import Button from '../src/components/Button/Button.vue'
import { SPRINGS, springEasing } from '../src/composables/springEasing'
import { vAnimate } from '../src/directives/vAnimate'

afterEach(() => {
  document.body.innerHTML = ''
})
const frame = () => new Promise(requestAnimationFrame)
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
// A linear() curve's first values, without the stops a browser adds when it writes one back.
const head = (easing: unknown) =>
  String(easing)
    .replace(/^linear\(|\)$/g, '')
    .split(',')
    .slice(0, 8)
    .map((stop) => parseFloat(stop))
    .join()

test('a spring can ease one step of keyframes, by name or by numbers', async () => {
  render(() =>
    h(
      Button as never,
      {
        motion: {
          states: {
            active: {
              root: {
                scale: {
                  value: ['1', '1.15', '1'],
                  times: [0, 0.1, 1],
                  easing: ['linear', 'bouncy'],
                  duration: 600,
                },
              },
            },
          },
        },
      },
      () => 'Press',
    ),
  )
  const button = () => document.querySelector<HTMLElement>('.ui-button')!
  await wait(300)
  button().dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }),
  )
  const steps = await vi.waitFor(() => {
    const run = button()
      .getAnimations()
      .find((a) => (a.effect as KeyframeEffect).getKeyframes().length === 3)
    expect(run).toBeTruthy()
    return (run!.effect as KeyframeEffect).getKeyframes().map((k) => k.easing)
  })
  window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
  expect(steps[0]).toBe('linear')
  expect(head(steps[1])).toBe(head(springEasing(SPRINGS.bouncy).easing))
})

// When an element's entrance starts, in ms: its animation's delay or its transition's.
const startOf = (el: Element) => {
  const animation = el.getAnimations()[0]
  if (animation) return Math.round(Number(animation.effect?.getTiming().delay ?? 0))
  const delay = (el as HTMLElement).style.transitionDelay.split(',')[0]?.trim() ?? ''
  return Math.round(parseFloat(delay) * (delay.endsWith('ms') ? 1 : 1000)) || 0
}

test("a component's repeated part staggers by the token with `stagger: true`", async () => {
  const Rating = (await import('../src/components/Rating/Rating.vue')).default
  render(() =>
    h(Rating as never, {
      modelValue: 3,
      'aria-label': 'Rating',
      motion: { initial: { item: { opacity: 0, scale: 0.6 } }, stagger: true },
    }),
  )
  const items = await vi.waitFor(() => {
    const all = [...document.querySelectorAll<HTMLElement>('.ui-rating-item')]
    expect(all.length).toBe(5)
    expect(all.every((el) => el.getAnimations().length || el.style.transition)).toBe(true)
    return all
  })
  expect(items.map(startOf)).toEqual([0, 40, 80, 120, 160])
})

test("a list's new items stagger from the end with `stagger: 'end'`", async () => {
  const Timeline = (await import('../src/components/Timeline/Timeline.vue')).default
  const items = shallowRef(['a'])
  render(
    () =>
      h(Timeline as never, {
        items: items.value,
        motion: { initial: { item: { opacity: 0, y: 8 } }, stagger: 'end' },
      }),
    { global: { stubs: { transition: false, 'transition-group': false } } },
  )
  await wait(300)
  items.value = ['a', 'b', 'c', 'd']
  const added = await vi.waitFor(() => {
    const all = [...document.querySelectorAll<HTMLElement>('.ui-timeline-step')].slice(1)
    expect(all.length).toBe(3)
    expect(all.every((el) => el.getAnimations().length || el.style.transition)).toBe(true)
    return all
  })
  const starts = added.map(startOf)
  expect(starts[0]).toBeGreaterThan(starts[1]!)
  expect(starts[1]).toBeGreaterThan(starts[2]!)
  expect(starts[2]).toBe(0)
})

test('a layout slide waits for `delay`, holding its old place meanwhile', async () => {
  const order = shallowRef([1, 2, 3])
  render(() =>
    h(
      'ul',
      { style: 'margin: 0; padding: 0; list-style: none' },
      order.value.map((n) =>
        withDirectives(h('li', { key: n, class: `row-${n}`, style: 'height: 30px' }, `Row ${n}`), [
          [vAnimate, { layout: true, delay: 0.2, duration: 300, easing: 'linear' }],
        ]),
      ),
    ),
  )
  await wait(500)
  const top = () => document.querySelector('.row-3')!.getBoundingClientRect().top
  const before = top()
  order.value = [3, 1, 2]
  await frame()
  await frame()
  // 60 px up in layout, but held where it was during the delay.
  expect(Math.abs(top() - before)).toBeLessThan(2)
  const slide = document.querySelector('.row-3')!.getAnimations()[0]
  expect(slide?.effect?.getTiming().delay).toBe(200)
  await wait(700)
  expect(before - top()).toBeCloseTo(60, 0)
})

test("appear: 'later' skips what's there at first render and plays what comes after", async () => {
  const items = shallowRef([1, 2])
  render(() =>
    h(
      'ul',
      items.value.map((n) =>
        withDirectives(h('li', { key: n, class: `later-${n}` }, `Row ${n}`), [
          [vAnimate, { initial: { opacity: 0, y: 8 }, appear: 'later' }],
        ]),
      ),
    ),
  )
  await frame()
  await frame()
  const moving = (n: number) => {
    const el = document.querySelector<HTMLElement>(`.later-${n}`)!
    return el.getAnimations().length > 0 || !!el.style.transition
  }
  expect(moving(1) || moving(2)).toBe(false)
  items.value = [1, 2, 3]
  await vi.waitFor(() => expect(moving(3)).toBe(true))
})

test('a loop whose duration changes while it plays speeds up where it is, without restarting', async () => {
  const pace = shallowRef(200)
  render(() =>
    h(
      Button as never,
      {
        motion: {
          states: {
            active: {
              root: {
                x: { value: [0, 2, 0], duration: pace.value, repeat: Infinity, easing: 'linear' },
              },
            },
          },
        },
      },
      () => 'Hold',
    ),
  )
  const button = () => document.querySelector<HTMLElement>('.ui-button')!
  await wait(300)
  button().dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }),
  )
  const loop = () =>
    button()
      .getAnimations()
      .find((a) => a.effect?.getTiming().iterations === Infinity)
  const first = await vi.waitFor(() => {
    expect(loop()).toBeTruthy()
    return loop()!
  })
  await wait(120)
  pace.value = 50
  await frame()
  await frame()
  // The same animation, now four times as fast.
  expect(loop()).toBe(first)
  expect(first.playbackRate).toBeCloseTo(4)
  window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
})

test('after works with no component around: the body waits for the title, then comes in', async () => {
  const show = shallowRef(false)
  render(() =>
    show.value
      ? h('div', [
          withDirectives(h('h2', { class: 'title' }, 'Title'), [
            [vAnimate, { initial: { opacity: 0, y: 8 }, duration: 300, easing: 'linear' }, 'title'],
          ]),
          withDirectives(h('p', { class: 'body' }, 'Body'), [
            [
              vAnimate,
              { initial: { opacity: 0 }, after: 'title', duration: 200, easing: 'linear' },
              'body',
            ],
          ]),
        ])
      : null,
  )
  await frame()
  show.value = true
  const opacity = (selector: string) =>
    Number(getComputedStyle(document.querySelector(selector)!).opacity)
  await vi.waitFor(() => expect(opacity('.title')).toBeGreaterThan(0.2))
  // The title is on its way; the body hasn't started.
  expect(opacity('.body')).toBeLessThan(0.05)
  await vi.waitFor(() => expect(opacity('.title')).toBe(1), { timeout: 2000 })
  await vi.waitFor(() => expect(opacity('.body')).toBeGreaterThan(0.5), { timeout: 2000 })
  await vi.waitFor(() => expect(opacity('.body')).toBe(1), { timeout: 2000 })
})
