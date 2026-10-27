// The motion API's last gaps: springs inside keyframes, stagger on components, delayed layout
// slides, `appear: 'later'`, `after` on its own, and loops that change speed without restarting.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, shallowRef, withDirectives } from 'vue'
import Button from '../src/components/Button/Button.vue'
import { SPRINGS, springEasing } from '../src/motion/springEasing'
import { vAnimate } from '../src/motion/vAnimate'

afterEach(() => {
  document.body.innerHTML = ''
})
const frame = () => new Promise(requestAnimationFrame)
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
// A linear() curve's first values, without the stops a browser adds when it writes one back.
// The first stops of a linear() easing, to two decimals: WebKit writes them back rounded so.
const head = (easing: unknown) =>
  String(easing)
    .replace(/^linear\(|\)$/g, '')
    .split(',')
    .slice(0, 8)
    .map((stop) => parseFloat(stop).toFixed(2))
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
// The hold that keeps an item unseen while its motion loads isn't its entrance.
const playing = (el: Element) => el.getAnimations().filter((a) => a.id !== 'ui-held')
const startOf = (el: Element) => {
  const animation = playing(el)[0]
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
    expect(all.every((el) => playing(el).length || el.style.transition)).toBe(true)
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
    expect(all.every((el) => playing(el).length || el.style.transition)).toBe(true)
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

test('a derived exit retracts what grew from far smaller, per axis, and never grows on the way out', async () => {
  const { exitFrom } = await import('../src/motion/layout')
  expect(exitFrom({ scale: '0 1' }).scale).toBe('0 1')
  expect(exitFrom({ scale: 0.9 }).scale).toBe('0.95')
  expect(exitFrom({ scale: '0.9 0.2' }).scale).toBe('0.95 0.2')
  // A strike removed before its entrance began: it leaves without ever showing.
  const show = shallowRef(false)
  render(() =>
    h(
      'div',
      { style: 'width: 200px' },
      show.value
        ? [
            withDirectives(
              h('span', { class: 'strike', style: 'display: block; height: 2px; background: red' }),
              [[vAnimate, { initial: { scale: '0 1' }, duration: 300, delay: 0.5 }]],
            ),
          ]
        : [],
    ),
  )
  await frame()
  show.value = true
  await wait(120)
  let widest = 0
  let raf = 0
  const tick = () => {
    for (const el of document.querySelectorAll<HTMLElement>('.strike'))
      widest = Math.max(widest, Number(getComputedStyle(el).scale.split(' ')[0]) || 0)
    raf = requestAnimationFrame(tick)
  }
  tick()
  show.value = false
  await wait(400)
  cancelAnimationFrame(raf)
  expect(widest).toBeLessThan(0.05)
})

test('a replay that cuts another short keeps the look Vue binds, and leaves no transition', async () => {
  const turn = shallowRef(0)
  const state = shallowRef<'idle' | 'ready' | 'loading'>('idle')
  const looks = {
    idle: {},
    ready: { rotate: '180deg' },
    loading: { rotate: '180deg', opacity: 0, scale: 0.4 },
  }
  const motions = {
    idle: {},
    ready: { initial: { rotate: 0 }, spring: { damping: 0.4, response: 0.3 } },
    loading: { initial: { opacity: 1, scale: 1 }, duration: 200 },
  }
  render(() =>
    withDirectives(h('div', { class: 'arrow', style: looks[state.value] }, 'A'), [
      [vAnimate, { ...motions[state.value], replay: turn.value }],
    ]),
  )
  await wait(200)
  state.value = 'ready'
  turn.value++
  await wait(120)
  // Mid-spring, a second replay onto a new bound look.
  state.value = 'loading'
  turn.value++
  await wait(800)
  const el = document.querySelector<HTMLElement>('.arrow')!
  const look = getComputedStyle(el)
  expect([look.opacity, look.scale, look.rotate]).toEqual(['0', '0.4', '180deg'])
  expect(el.style.transition).toBe('')
})

test('a keyed swap: the old icon leaves in place over the new one, an svg root included', async () => {
  const icon = (name: string) =>
    defineComponent({
      render: () =>
        h('svg', { class: name, viewBox: '0 0 16 16', width: 16, height: 16 }, [
          h('path', { d: 'M2 2h12v12H2z' }),
        ]),
    })
  const [Copy, Check] = [icon('copy'), icon('check')]
  const copied = shallowRef(false)
  const swap = {
    initial: { scale: 0.4, opacity: 0, rotate: -45 },
    exit: { scale: 0.4, opacity: 0, rotate: 45 },
    spring: { damping: 0.6, response: 0.3 },
  }
  render(() =>
    h('button', { style: 'display: inline-grid; place-items: center; width: 40px; height: 40px' }, [
      withDirectives(h(copied.value ? Check : Copy, { key: String(copied.value) }), [
        [vAnimate, swap],
      ]),
    ]),
  )
  await wait(300)
  const button = document.querySelector('button')!
  copied.value = true
  await frame()
  await frame()
  await frame()
  // Both at once: the copy icon turning away out of the flow, the check coming in.
  const leaving = button.querySelector<SVGElement>('svg.copy')!
  const entering = button.querySelector<SVGElement>('svg.check')!
  expect(getComputedStyle(leaving).position).toBe('absolute')
  expect(Number(getComputedStyle(leaving).opacity)).toBeLessThan(1)
  expect(Number(getComputedStyle(entering).opacity)).toBeGreaterThan(0)
  expect(button.getBoundingClientRect().width).toBe(40)
  await wait(700)
  expect(button.querySelector('svg.copy')).toBeNull()
  expect(getComputedStyle(entering).opacity).toBe('1')
})

test("appear: 'later' on a component's root: what's there at first shows, a swap in plays", async () => {
  const icon = (name: string) =>
    defineComponent({ render: () => h('svg', { class: name, width: 16, height: 16 }) })
  const [Copy, Check] = [icon('copy'), icon('check')]
  const copied = shallowRef(false)
  const swap = { appear: 'later' as const, initial: { opacity: 0 }, duration: 400 }
  // A component of its own, as a template is: the directive's owner is that component.
  render(
    defineComponent({
      setup: () => () => withDirectives(h(copied.value ? Check : Copy), [[vAnimate, swap]]),
    }),
  )
  await frame()
  await frame()
  expect(getComputedStyle(document.querySelector('svg.copy')!).opacity).toBe('1')
  copied.value = true
  await frame()
  await frame()
  await frame()
  expect(Number(getComputedStyle(document.querySelector('svg.check')!).opacity)).toBeLessThan(1)
})

test('a box growing with .size keeps what already peeked past it: seen and under the pointer', async () => {
  const open = shallowRef(false)
  const style = document.createElement('style')
  style.textContent = `
    .peek-stack { display: grid; align-items: start; inline-size: 240px; isolation: isolate; }
    .peek-card { block-size: 60px; background: white; box-shadow: 0 1px 2px #0002; }
    .peek-stack:not([data-open]) .peek-card { grid-area: 1 / 1; }
    .peek-stack:not([data-open]) .peek-card:nth-child(2) { translate: 0 10px; z-index: -1; }
    .peek-stack:not([data-open]) .peek-card:nth-child(3) { translate: 0 20px; z-index: -2; }
    .peek-stack[data-open] { gap: 8px; }`
  document.head.append(style)
  const spring = { spring: { damping: 0.85, response: 0.32 } }
  render(
    defineComponent({
      setup: () => () =>
        withDirectives(
          h(
            'div',
            { class: 'peek-stack', 'data-open': open.value || undefined },
            [1, 2, 3].map((n) =>
              withDirectives(h('div', { key: n, class: 'peek-card' }), [
                [vAnimate, { layout: true, ...spring }],
              ]),
            ),
          ),
          [[vAnimate, spring, undefined, { size: true }]],
        ),
    }),
  )
  await wait(300)
  const stack = document.querySelector<HTMLElement>('.peek-stack')!
  const box = stack.getBoundingClientRect()
  // On the third card's edge, peeking below the collapsed box.
  const [x, y] = [box.left + box.width / 2, box.bottom + 15]
  expect(document.elementFromPoint(x, y)?.closest('.peek-stack')).toBe(stack)
  open.value = true
  const missed: number[] = []
  for (let i = 0; i < 30; i++) {
    await frame()
    if (document.elementFromPoint(x, y)?.closest('.peek-stack') !== stack) missed.push(i)
  }
  style.remove()
  expect(missed).toEqual([])
})

test("the CSS engine keeps an element's own transitions for what it doesn't move", async () => {
  const turn = shallowRef(0)
  const warm = shallowRef(false)
  const style = document.createElement('style')
  style.textContent =
    '.own-fade { transition: color 600ms linear; color: rgb(0, 0, 0) } .own-fade.warm { color: rgb(255, 0, 0) }'
  document.head.append(style)
  render(
    defineComponent({
      setup: () => () =>
        withDirectives(h('span', { class: ['own-fade', { warm: warm.value }] }, '42'), [
          [vAnimate, { initial: { scale: 1.2 }, duration: 400, replay: turn.value, appear: false }],
        ]),
    }),
  )
  await frame()
  const el = document.querySelector<HTMLElement>('.own-fade')!
  turn.value++
  warm.value = true
  await wait(150)
  // Mid-fade, while the swell plays: its own colour transition is still running.
  const [r] = getComputedStyle(el).color.match(/\d+/g)!.map(Number)
  style.remove()
  expect(r).toBeGreaterThan(20)
  expect(r).toBeLessThan(235)
})

test('a number on a custom property stays a number: a registered integer counts up', async () => {
  try {
    CSS.registerProperty({
      name: '--gap-count',
      syntax: '<integer>',
      inherits: false,
      initialValue: '7',
    })
  } catch {}
  render(
    defineComponent({
      setup: () => () =>
        withDirectives(h('span', { class: 'counts', style: { '--gap-count': 50 } }, 'n'), [
          [vAnimate, { initial: { '--gap-count': 0 }, duration: 600, easing: 'linear' }],
        ]),
    }),
  )
  await wait(250)
  const now = Number(
    getComputedStyle(document.querySelector('.counts')!).getPropertyValue('--gap-count'),
  )
  // From 0, not the registered 7 an invalid `0px` would have fallen back to.
  expect(now).toBeGreaterThan(5)
  expect(now).toBeLessThan(45)
  expect(now).not.toBe(7)
})

test('a replay right after a scroll still plays: only mounts wait out scrolling', async () => {
  const turn = shallowRef(0)
  render(
    defineComponent({
      setup: () => () =>
        withDirectives(h('p', { class: 'replayed' }, 'Again'), [
          [vAnimate, { initial: { opacity: 0 }, duration: 400, replay: turn.value, appear: false }],
        ]),
    }),
  )
  await frame()
  document.dispatchEvent(new Event('scroll'))
  turn.value++
  await frame()
  await frame()
  await frame()
  expect(Number(getComputedStyle(document.querySelector('.replayed')!).opacity)).toBeLessThan(1)
})

test('a look back after `animate` was dropped animates in, from its own look', async () => {
  const big = shallowRef(true)
  render(
    defineComponent({
      setup: () => () =>
        withDirectives(h('p', { class: 'held' }, 'Held'), [
          [vAnimate, big.value ? { animate: { scale: 1.5 }, duration: 300 } : { duration: 300 }],
        ]),
    }),
  )
  await wait(400)
  const el = document.querySelector<HTMLElement>('.held')!
  // Dropped: its own look at once, nothing left inline.
  big.value = false
  await frame()
  await frame()
  expect(getComputedStyle(el).scale).toBe('none')
  big.value = true
  await frame()
  await frame()
  await frame()
  const back = Number(getComputedStyle(el).scale)
  expect(back).toBeGreaterThan(1)
  expect(back).toBeLessThan(1.45)
})

test('an absolutely placed element leaving follows its container: a bubble stays on a shrinking edge', async () => {
  const big = shallowRef(true)
  render(
    defineComponent({
      setup: () => () =>
        h(
          'div',
          {
            class: 'pill',
            style: `position: relative; height: 20px; width: ${big.value ? 200 : 100}px`,
          },
          [
            big.value
              ? withDirectives(
                  h('span', {
                    class: 'bubble',
                    style: 'position: absolute; left: 100%; top: 0; width: 20px; height: 20px',
                  }),
                  [
                    [
                      vAnimate,
                      {
                        initial: { opacity: 0 },
                        exit: { opacity: 0 },
                        duration: 400,
                        easing: 'linear',
                      },
                    ],
                  ],
                )
              : null,
          ],
        ),
    }),
  )
  await wait(500)
  big.value = false
  await wait(100)
  const pill = document.querySelector<HTMLElement>('.pill')!.getBoundingClientRect()
  const bubble = document.querySelector<HTMLElement>('.bubble')
  // Still leaving, on the pill's new edge, not where the old one was.
  expect(bubble).not.toBeNull()
  expect(Math.abs(bubble!.getBoundingClientRect().left - pill.right)).toBeLessThan(1)
})

test('a size rides the spring like a move: a bouncy width overshoots, an opacity beside it eases', async () => {
  render(
    defineComponent({
      setup: () => () =>
        h('div', { style: 'width: 300px' }, [
          withDirectives(h('div', { class: 'grows', style: 'width: 200px; height: 10px' }), [
            [
              vAnimate,
              { initial: { width: '0px', opacity: 0 }, spring: { damping: 0.4, response: 0.4 } },
            ],
          ]),
        ]),
    }),
  )
  let widest = 0
  for (let i = 0; i < 40; i++) {
    await frame()
    widest = Math.max(
      widest,
      document.querySelector<HTMLElement>('.grows')!.getBoundingClientRect().width,
    )
  }
  expect(widest).toBeGreaterThan(210)
  expect(getComputedStyle(document.querySelector('.grows')!).opacity).toBe('1')
})

test("a token named inside a retimed component means the theme's, not the component's", async () => {
  const { default: Card } = await import('../src/components/Card/Card.vue')
  const turn = shallowRef(0)
  render(
    defineComponent({
      setup: () => () =>
        h(Card as never, { motion: { duration: 900, easing: 'linear' } }, () =>
          withDirectives(h('p', { class: 'inside' }, 'Inside'), [
            [
              vAnimate,
              {
                initial: { opacity: 0 },
                duration: 300,
                easing: 'out',
                replay: turn.value,
                appear: false,
              },
            ],
          ]),
        ),
    }),
  )
  await wait(100)
  const card = document.querySelector<HTMLElement>('.ui-card')!
  // The card's own transitions follow its timing.
  expect(getComputedStyle(card).getPropertyValue('--ui-ease-out').trim()).toBe('linear')
  turn.value++
  await frame()
  await frame()
  const inside = document.querySelector<HTMLElement>('.inside')!
  expect(getComputedStyle(inside).transitionTimingFunction).toContain(
    'cubic-bezier(0.23, 1, 0.32, 1)',
  )
})
