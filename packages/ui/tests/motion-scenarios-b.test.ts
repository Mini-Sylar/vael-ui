// Motion scenarios 19-37 (motion-v / Motion test expectations, restated for v-animate).
import '../src/style.css'
import { afterEach, expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import {
  defineAsyncComponent,
  defineComponent,
  h,
  nextTick,
  shallowRef,
  vShow,
  withDirectives,
} from 'vue'
import Popover from '../src/components/Popover/Popover.vue'
import { vAnimate } from '../src/motion/vAnimate'

const real = { global: { stubs: { transition: false, 'transition-group': false } } }
const frame = () => new Promise<number>(requestAnimationFrame)
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const opacityOf = (el: Element) => Number(getComputedStyle(el).opacity)
const layoutRuns = (el: Element) => el.getAnimations().filter((run) => run.id === 'ui-layout')
const firstTransform = (el: Element) => {
  const run = layoutRuns(el)[0]
  return run ? String((run.effect as KeyframeEffect).getKeyframes()[0]!.transform) : null
}
const numbers = (text: string) => (text.match(/-?[\d.]+(e-?\d+)?/g) ?? []).map(Number)

type Sample<T> = { t: number; v: T }
/** Reads once per frame until stopped. */
function sampler<T>(read: () => T) {
  const out: Sample<T>[] = []
  let on = true
  const tick = () => {
    if (!on) return
    out.push({ t: performance.now(), v: read() })
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  return {
    out,
    stop: () => {
      on = false
      return out
    },
  }
}
const deltas = (values: number[]) => values.slice(1).map((v, i) => Math.abs(v - values[i]!))
/** The last sample before `at` and the first one after it. */
const around = <T>(out: Sample<T>[], at: number) => {
  const i = out.findIndex((s) => s.t > at)
  return [out[i - 1]!.v, out[i]!.v] as const
}

afterEach(() => {
  document.body.innerHTML = ''
})

// ─── Presence and exit ───────────────────────────────────────────────────────

test('19: opening one panel while another leaves inside a .size box animates both; the box lands clean; an interrupted close keeps going the same way', async () => {
  const openId = shallowRef<string | null>('a')
  const panel = (id: string, height: number) =>
    withDirectives(h('div', { key: id, class: `p${id}`, style: `height: ${height}px` }), [
      [vAnimate, { initial: { opacity: 0 }, duration: 600 }],
    ])
  render({
    setup: () => () =>
      withDirectives(
        h('div', { class: 'box', style: 'margin-top: 40px' }, [
          openId.value === 'a' ? panel('a', 200) : null,
          openId.value === 'b' ? panel('b', 100) : null,
        ]),
        [[vAnimate, { duration: 600, easing: 'linear' }, undefined, { size: true }]],
      ),
  })
  const box = document.querySelector<HTMLElement>('.box')!
  await wait(800)
  expect(box.getBoundingClientRect().height).toBeCloseTo(200, 0)

  openId.value = 'b'
  // A derived exit is quick by design (the exit token, not the panel's 600 ms): mid-fade early on.
  await wait(60)
  const ghost = document.querySelector('.pa')
  expect.soft(ghost, 'the leaving .pa is still in the DOM at 60 ms').not.toBeNull()
  if (ghost) {
    expect.soft(ghost.getAttribute('aria-hidden')).toBe('true')
    expect.soft(opacityOf(ghost)).toBeGreaterThan(0)
    expect.soft(opacityOf(ghost)).toBeLessThan(1)
  }
  await wait(140)
  const height = box.getBoundingClientRect().height
  const incoming = document.querySelector('.pb')!
  expect.soft(height).toBeGreaterThan(100)
  expect.soft(height).toBeLessThan(200)
  expect.soft(document.querySelector('.pa'), 'gone on the exit token by 200 ms').toBeNull()
  expect.soft(opacityOf(incoming)).toBeGreaterThan(0)

  // Landed: the clipping it put on the box while something left is taken off.
  await wait(600)
  expect.soft(box.getBoundingClientRect().height).toBeCloseTo(100, 0)
  expect.soft(document.querySelector('.pa')).toBeNull()
  expect.soft(box.style.overflow).toBe('')
  expect.soft(box.style.position).toBe('')

  // Interrupted: a -> b, then closed 150 ms later.
  openId.value = 'a'
  await wait(900)
  expect(box.getBoundingClientRect().height).toBeCloseTo(200, 0)
  const s = sampler(() => box.getBoundingClientRect().height)
  await frame()
  openId.value = 'b'
  await wait(150)
  openId.value = null
  await wait(900)
  const heights = s.stop().map((x) => x.v)
  // Never grows back, never jumps (15% of 200px).
  const rises = heights.slice(1).filter((v, i) => v > heights[i]! + 0.5)
  expect.soft(rises, 'frames where the height went back up').toEqual([])
  expect.soft(Math.max(...deltas(heights))).toBeLessThan(30)
  expect.soft(heights.at(-1)).toBeCloseTo(0, 0)
})

test("20: a Popover swap in 'wait' mode under rapid key changes ends on the latest view, never shows two at once", async () => {
  const view = shallowRef('A')
  const trigger = ({ setTriggerEl }: { setTriggerEl: (el: unknown) => void }) =>
    h('button', { ref: setTriggerEl }, 'Trigger')
  render(
    {
      setup: () => () =>
        h(
          Popover as never,
          { open: true, motion: { swap: 'wait' } },
          {
            trigger,
            default: () =>
              withDirectives(h('div', { key: view.value, class: 'view' }, view.value), [
                [vAnimate, { initial: { opacity: 0 } }, 'view'],
              ]),
          },
        ),
    },
    real,
  )
  const views = () => [...document.querySelectorAll('.ui-popover-panel .view')]
  for (let i = 0; i < 100; i++) {
    const panel = document.querySelector('.ui-popover-panel')
    if (panel && !panel.getAnimations({ subtree: true }).length && views().length) break
    await wait(20)
  }
  await wait(300)
  expect(views().map((v) => v.textContent)).toEqual(['A'])

  const run = async (steps: [string, number][], last: string) => {
    const s = sampler(() => {
      const all = views()
      return { count: all.length, shown: all.filter((v) => opacityOf(v) > 0.01).length }
    })
    for (const [key, after] of steps) {
      await wait(after)
      view.value = key
    }
    await wait(600)
    const out = s.stop()
    expect.soft(views().map((v) => v.textContent)).toEqual([last])
    expect
      .soft(Math.max(...out.map((x) => x.v.shown)), 'views visible at once')
      .toBeLessThanOrEqual(1)
    // The longest stretch with no view at all.
    let longest = 0
    let since: number | undefined
    for (const { t, v } of out) {
      if (!v.count) since ??= t
      else if (since !== undefined) {
        longest = Math.max(longest, t - since)
        since = undefined
      }
    }
    // 150 ms capped exit plus the enter (Popover's default, a spring of about 0.32 s at most).
    expect.soft(longest).toBeLessThan(150 + 400)
  }
  await run(
    [
      ['B', 0],
      ['C', 40],
      ['A', 40],
    ],
    'A',
  )
  // The last change lands as the exit finishes.
  await run(
    [
      ['B', 0],
      ['C', 150],
    ],
    'C',
  )
})

// ─── layoutId ────────────────────────────────────────────────────────────────

test('21: layoutId swapped back and forth every 150 ms reverses from where it shows, with no jump, and lands on its own box', async () => {
  const open = shallowRef(false)
  const look = { layoutId: 'x', duration: 400, easing: 'linear' }
  render({
    setup: () => () =>
      h('div', [
        h('div', { class: 'slot-up', style: 'height: 40px' }, [
          open.value
            ? null
            : withDirectives(h('button', { class: 'up' }, 'Reply'), [[vAnimate, look]]),
        ]),
        h('div', { class: 'slot-down', style: 'height: 40px; padding-left: 100px' }, [
          open.value
            ? withDirectives(h('button', { class: 'down' }, 'Reply'), [[vAnimate, look]])
            : null,
        ]),
      ]),
  })
  await frame()
  await frame()
  const s = sampler(() => {
    const all = document.querySelectorAll<HTMLElement>('[data-layout-id="x"]')
    const el = all[0]
    const box = el?.getBoundingClientRect()
    return { count: all.length, el, x: box?.left ?? NaN, y: box?.top ?? NaN }
  })
  for (let i = 0; i < 6; i++) {
    await wait(150)
    open.value = !open.value
  }
  await wait(600)
  const out = s.stop()
  expect(out.every((x) => x.v.count === 1)).toBe(true)
  const travel = Math.hypot(100, 40)
  // At each swap: the first frame of the newcomer within 2px of the last frame of the one before.
  const swaps = out
    .map((x, i) => (i && x.v.el !== out[i - 1]!.v.el ? i : -1))
    .filter((i) => i > 0)
    .map((i) => Math.hypot(out[i]!.v.x - out[i - 1]!.v.x, out[i]!.v.y - out[i - 1]!.v.y))
  expect(swaps).toHaveLength(6)
  expect.soft(Math.max(...swaps), 'largest step at a swap (px)').toBeLessThanOrEqual(2)
  const steps = out.slice(1).map((x, i) => Math.hypot(x.v.x - out[i]!.v.x, x.v.y - out[i]!.v.y))
  expect.soft(Math.max(...steps), 'largest step on any frame (px)').toBeLessThan(travel * 0.15)
  // Six swaps from closed: closed again, at its own place.
  const up = document.querySelector<HTMLElement>('.up')!
  const slot = document.querySelector('.slot-up')!.getBoundingClientRect()
  expect(up.getAnimations()).toHaveLength(0)
  expect(getComputedStyle(up).transform).toBe('none')
  expect(up.getBoundingClientRect().left).toBeCloseTo(slot.left, 0)
  expect(up.getBoundingClientRect().top).toBeCloseTo(slot.top, 0)
})

test('22: a tab underline clicked across four tabs 30 ms apart lands under the last one, alone, with no jump', async () => {
  const active = shallowRef(1)
  const look = { layoutId: 'ul', duration: 300, easing: 'linear' }
  render({
    setup: () => () =>
      h(
        'div',
        { style: 'display: flex' },
        [1, 2, 3, 4].map((t) =>
          h(
            'button',
            {
              key: t,
              class: `tab tab-${t}`,
              style: 'display: block; width: 80px; height: 30px; padding: 0; border: 0',
              onClick: () => (active.value = t),
            },
            [
              active.value === t
                ? withDirectives(h('span', { class: 'ul', style: 'display: block; height: 2px' }), [
                    [vAnimate, look],
                  ])
                : null,
            ],
          ),
        ),
      ),
  })
  await frame()
  await frame()
  const tab = (n: number) => document.querySelector<HTMLElement>(`.tab-${n}`)!
  const s = sampler(() => {
    const all = document.querySelectorAll('.ul')
    return { count: all.length, x: all[0]?.getBoundingClientRect().left ?? NaN }
  })
  for (const n of [2, 3, 4]) {
    tab(n).click()
    await wait(30)
  }
  await wait(310)
  const out = s.stop()
  const ul = document.querySelectorAll<HTMLElement>('.ul')
  expect(ul).toHaveLength(1)
  expect(tab(4).contains(ul[0]!)).toBe(true)
  expect(ul[0]!.getBoundingClientRect().left).toBeCloseTo(tab(4).getBoundingClientRect().left, 0)
  expect(layoutRuns(ul[0]!), 'ui-layout runs left 300 ms after the last click').toHaveLength(0)
  expect(out.every((x) => x.v.count === 1)).toBe(true)
  const distance = tab(4).getBoundingClientRect().left - tab(1).getBoundingClientRect().left
  expect(Math.max(...deltas(out.map((x) => x.v.x)))).toBeLessThan(distance * 0.15)
})

test("23: taking over a layoutId in the same tick doesn't replay initial; a first arrival after the other has gone does", async () => {
  const which = shallowRef<'a' | 'b' | null>('a')
  const look = {
    layoutId: 'card',
    initial: { opacity: 0, scale: 0.9 },
    duration: 300,
    easing: 'linear',
  }
  const card = (id: string) =>
    withDirectives(h('div', { class: `card-${id}`, style: 'width: 80px; height: 40px' }), [
      [vAnimate, look],
    ])
  render({
    setup: () => () =>
      h('div', [
        h('div', { style: 'height: 60px' }, [which.value === 'a' ? card('a') : null]),
        h('div', { style: 'height: 60px; padding-left: 100px' }, [
          which.value === 'b' ? card('b') : null,
        ]),
      ]),
  })
  await wait(500)
  which.value = 'b'
  await nextTick()
  const b = document.querySelector<HTMLElement>('.card-b')!
  let slid = false
  const sb = sampler(() => {
    slid ||= layoutRuns(b).length > 0
    return opacityOf(b)
  })
  await wait(400)
  const takeOver = sb.stop().map((x) => x.v)
  expect(slid, 'B slides over from A').toBe(true)
  expect(Math.min(...takeOver), 'B opacity, lowest frame').toBe(1)

  which.value = null
  await wait(250)
  which.value = 'a'
  await nextTick()
  const a = document.querySelector<HTMLElement>('.card-a')!
  let aSlid = false
  const sa = sampler(() => {
    aSlid ||= layoutRuns(a).length > 0
    return opacityOf(a)
  })
  await wait(500)
  const arrival = sa.stop().map((x) => x.v)
  expect(aSlid, 'a late arrival slides').toBe(false)
  expect(arrival[0]!, 'opacity on its first frame').toBeLessThan(0.3)
  expect(arrival.at(-1)).toBe(1)
})

test('24: a layoutId target that mounts a tick late (nextTick, microtask, setTimeout 0, async component) still slides from the old box; 150 ms late it appears instead', async () => {
  const a = shallowRef(true)
  const b = shallowRef(false)
  const bAsync = shallowRef(false)
  const look = { layoutId: 'late', initial: { opacity: 0 }, duration: 300, easing: 'linear' }
  const B = defineComponent({
    render: () =>
      withDirectives(h('div', { class: 'b', style: 'width: 80px; height: 40px' }), [
        [vAnimate, look],
      ]),
  })
  const AsyncB = defineAsyncComponent(
    () => new Promise<typeof B>((r) => setTimeout(() => r(B), 20)),
  )
  render({
    setup: () => () =>
      h('div', [
        h('div', { style: 'height: 60px' }, [
          a.value
            ? withDirectives(h('div', { class: 'a', style: 'width: 80px; height: 40px' }), [
                [vAnimate, look],
              ])
            : null,
        ]),
        h('div', { class: 'slot-b', style: 'height: 60px; padding-left: 120px' }, [
          b.value ? h(B) : null,
          bAsync.value ? h(AsyncB) : null,
        ]),
      ]),
  })
  await wait(400)
  const slotB = document.querySelector('.slot-b')!.getBoundingClientRect()
  const aBox = document.querySelector('.a')!.getBoundingClientRect()
  // From A's box to where B lands (slot's content edge).
  const expected = [aBox.left - (slotB.left + 120), aBox.top - slotB.top]
  const reset = async () => {
    b.value = bAsync.value = false
    await wait(300)
    a.value = true
    await wait(400)
  }
  const results: Record<string, string | null> = {}
  const cases: [string, (mount: () => void) => void, boolean][] = [
    ['nextTick', (mount) => void nextTick(mount), false],
    ['microtask', (mount) => queueMicrotask(mount), false],
    ['setTimeout 0', (mount) => setTimeout(mount, 0), false],
    ['async component', (mount) => mount(), true],
  ]
  for (const [name, later, async] of cases) {
    a.value = false
    later(() => (async ? (bAsync.value = true) : (b.value = true)))
    let el: Element | null = null
    for (let i = 0; i < 20 && !(el && layoutRuns(el).length); i++) {
      await frame()
      el = document.querySelector('.b')
    }
    results[name] = el ? firstTransform(el) : null
    await reset()
  }
  for (const [name, start] of Object.entries(results)) {
    expect.soft(start, `${name}: B slides`).not.toBeNull()
    if (!start) continue
    const [dx, dy] = numbers(start)
    expect.soft(Math.abs(dx! - expected[0]!), `${name}: x of first keyframe`).toBeLessThanOrEqual(1)
    expect.soft(Math.abs(dy! - expected[1]!), `${name}: y of first keyframe`).toBeLessThanOrEqual(1)
  }

  // 150 ms after A left: no slide, B's own appearance.
  a.value = false
  await wait(150)
  b.value = true
  await nextTick()
  const el = document.querySelector('.b')!
  let slid = false
  const s = sampler(() => {
    slid ||= layoutRuns(el).length > 0
    return opacityOf(el)
  })
  await wait(400)
  const opacity = s.stop().map((x) => x.v)
  expect(slid).toBe(false)
  expect(opacity[0]!).toBeLessThan(0.3)
  expect(opacity.at(-1)).toBe(1)
})

test('25: a layoutId element removed mid-slide with no successor is gone within a frame, and a later arrival does not slide from its mid-flight box', async () => {
  const which = shallowRef<'a' | 'b' | null>('a')
  const look = { layoutId: 'gone', duration: 400, easing: 'linear' }
  render({
    setup: () => () =>
      h('div', [
        h('div', { style: 'height: 60px' }, [
          which.value === 'a'
            ? withDirectives(h('div', { class: 'a', style: 'width: 80px; height: 40px' }), [
                [vAnimate, look],
              ])
            : null,
        ]),
        h('div', { style: 'height: 60px; padding-left: 120px' }, [
          which.value === 'b'
            ? withDirectives(h('div', { class: 'b', style: 'width: 80px; height: 40px' }), [
                [vAnimate, { ...look, exit: { opacity: 0 } }],
              ])
            : null,
        ]),
      ]),
  })
  await wait(300)
  which.value = 'b'
  await nextTick()
  await frame()
  expect(layoutRuns(document.querySelector('.b')!).length).toBe(1)
  await wait(100)
  which.value = null
  await nextTick()
  await frame()
  expect(document.querySelector('[data-layout-id="gone"]')).toBeNull()
  expect(document.querySelector('[aria-hidden="true"]')).toBeNull()

  await wait(150)
  which.value = 'a'
  await nextTick()
  const a = document.querySelector('.a')!
  let slid = false
  const s = sampler(() => (slid ||= layoutRuns(a).length > 0))
  await wait(200)
  s.stop()
  expect(slid).toBe(false)
})

test.skip('25 (Motion only): a layoutId element removed with no successor plays its exit; unsupported, v-animate ignores `exit` with layoutId', () => {})

test('26: layoutId with v-show keeps both elements and never starts a slide from a hidden (0x0) box', async () => {
  const big = shallowRef(false)
  const look = { layoutId: 'b', duration: 300, easing: 'linear' }
  render({
    setup: () => () =>
      h('div', { class: 'stage' }, [
        withDirectives(h('div', { id: 'small', style: 'width: 40px; height: 40px' }), [
          [vShow, !big.value],
          [vAnimate, look],
        ]),
        withDirectives(
          h('div', { id: 'large', style: 'width: 200px; height: 120px; margin-left: 100px' }),
          [
            [vShow, big.value],
            [vAnimate, look],
          ],
        ),
      ]),
  })
  await frame()
  const small = document.querySelector<HTMLElement>('#small')!
  const large = document.querySelector<HTMLElement>('#large')!
  const s = sampler(() => layoutRuns(small).length + layoutRuns(large).length)
  for (let i = 0; i < 3; i++) {
    big.value = !big.value
    await wait(400)
  }
  const out = s.stop()
  expect(document.querySelector('#small')).toBe(small)
  expect(document.querySelector('#large')).toBe(large)
  expect(Math.max(...out.map((x) => x.v)), 'ui-layout runs seen during the toggles').toBe(0)
  // Three toggles: the large one shows, at its own box.
  const stage = document.querySelector('.stage')!.getBoundingClientRect()
  expect(getComputedStyle(large).display).not.toBe('none')
  expect(getComputedStyle(large).transform).toBe('none')
  expect(large.getBoundingClientRect().left).toBeCloseTo(stage.left + 100, 0)
  expect(large.getBoundingClientRect().top).toBeCloseTo(stage.top, 0)
})

test.skip('26 (Motion only): a v-show toggle between layoutId elements slides and interpolates size; unsupported, travel needs v-if', () => {})

test('27: a layoutId swap is not a crossfade: the old element is gone on the first frame and the newcomer stays fully opaque', async () => {
  const which = shallowRef<'a' | 'b'>('a')
  const look = { layoutId: 'card', duration: 300, easing: 'linear' }
  render({
    setup: () => () =>
      h('div', [
        h('div', { style: 'height: 60px' }, [
          which.value === 'a'
            ? withDirectives(
                h('div', { class: 'a', style: 'width: 80px; height: 40px; background: red' }),
                [[vAnimate, look]],
              )
            : null,
        ]),
        h('div', { style: 'height: 60px; padding-left: 120px' }, [
          which.value === 'b'
            ? withDirectives(
                h('div', { class: 'b', style: 'width: 120px; height: 60px; background: blue' }),
                [[vAnimate, look]],
              )
            : null,
        ]),
      ]),
  })
  await wait(200)
  which.value = 'b'
  await nextTick()
  const b = document.querySelector<HTMLElement>('.b')!
  let slid = false
  const s = sampler(() => {
    slid ||= layoutRuns(b).length > 0
    return {
      a: !!document.querySelector('.a'),
      count: document.querySelectorAll('[data-layout-id="card"]').length,
      opacity: opacityOf(b),
    }
  })
  await wait(400)
  const out = s.stop()
  expect(slid).toBe(true)
  expect(out[0]!.v.a, 'A on the first frame after the flush').toBe(false)
  expect(Math.max(...out.map((x) => x.v.count))).toBe(1)
  expect(Math.min(...out.map((x) => x.v.opacity))).toBe(1)
})

test.skip('27 (Motion only): a layoutId swap crossfades, the old element stays until the animation completes; unsupported, the old one is removed at once', () => {})

test('28: a zero-size layoutId source or target never makes NaN or Infinity, and a zero-height exit still removes the element', async () => {
  // (a) The source is 0x0: B appears with its initial instead.
  const zeroA = shallowRef(true)
  const look = { layoutId: 'z', initial: { opacity: 0 }, duration: 300, easing: 'linear' }
  render({
    setup: () => () =>
      h('div', [
        zeroA.value
          ? withDirectives(
              h('span', { class: 'za', style: 'display: inline-block; width: 0; height: 0' }),
              [[vAnimate, look]],
            )
          : withDirectives(h('div', { class: 'zb', style: 'width: 80px; height: 40px' }), [
              [vAnimate, look],
            ]),
      ]),
  })
  await wait(100)
  expect(document.querySelector('.za')!.getBoundingClientRect().width).toBe(0)
  zeroA.value = false
  await nextTick()
  const zb = document.querySelector('.zb')!
  let slid = false
  const s = sampler(() => {
    slid ||= layoutRuns(zb).length > 0
    return opacityOf(zb)
  })
  await wait(400)
  const opacity = s.stop().map((x) => x.v)
  expect.soft(slid, '(a) B slides from a 0x0 box').toBe(false)
  expect.soft(opacity[0]!, '(a) B starts from its initial').toBeLessThan(0.3)
  expect.soft(opacity.at(-1)).toBe(1)
  document.body.innerHTML = ''

  // (b) The target is an image with no size until it loads.
  const toImg = shallowRef(false)
  const src = shallowRef<string | undefined>(undefined)
  const look2 = { layoutId: 'img', duration: 300, easing: 'linear' }
  render({
    setup: () => () =>
      h('div', { style: 'padding-left: 50px' }, [
        toImg.value
          ? withDirectives(h('img', { class: 'img', src: src.value }), [[vAnimate, look2]])
          : withDirectives(h('div', { class: 'src', style: 'width: 100px; height: 50px' }), [
              [vAnimate, look2],
            ]),
      ]),
  })
  await wait(100)
  toImg.value = true
  await nextTick()
  const img = document.querySelector<HTMLImageElement>('.img')!
  expect(img.getBoundingClientRect().width).toBe(0)
  const frames: Keyframe[] = []
  for (let i = 0; i < 3; i++) {
    await frame()
    for (const run of layoutRuns(img)) frames.push(...(run.effect as KeyframeEffect).getKeyframes())
  }
  setTimeout(() => {
    src.value =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'/%3E"
  }, 50)
  await wait(600)
  const text = frames.map((k) => String(k.transform)).join(' ')
  expect.soft(text, '(b) keyframes').not.toMatch(/NaN|Infinity/)
  expect.soft(img.getAnimations(), '(b) runs after it settles').toHaveLength(0)
  expect.soft(getComputedStyle(img).transform).toBe('none')
  document.body.innerHTML = ''

  // (c) A 0-height element with an exit.
  const shown = shallowRef(true)
  render({
    setup: () => () =>
      h('div', { style: 'padding-top: 50px' }, [
        shown.value
          ? withDirectives(h('div', { class: 'flat', style: 'height: 0; width: 100px' }), [
              [vAnimate, { exit: { opacity: 0 }, duration: 300 }],
            ])
          : null,
      ]),
  })
  await wait(100)
  shown.value = false
  await nextTick()
  const removedAt = performance.now()
  let goneAfter = Infinity
  for (let i = 0; i < 60; i++) {
    if (!document.querySelector('.flat')) {
      goneAfter = performance.now() - removedAt
      break
    }
    await frame()
  }
  expect.soft(goneAfter, '(c) ms until it leaves the DOM').toBeLessThanOrEqual(300 + 100)
})

// ─── layout ──────────────────────────────────────────────────────────────────

test('29: a layout child mounting inside a container that is itself appearing does not slide, on every open; later a sibling resize still slides it', async () => {
  const open = shallowRef(false)
  const width = shallowRef(20)
  render({
    setup: () => () =>
      h('div', { style: 'padding: 40px' }, [
        open.value
          ? withDirectives(
              h('div', { class: 'card', style: 'display: flex; width: 300px' }, [
                h('div', { class: 'grow', style: { width: `${width.value}px`, height: '20px' } }),
                withDirectives(
                  h('div', {
                    id: 'layout-child',
                    style: 'margin-left: 40px; width: 30px; height: 20px',
                  }),
                  [[vAnimate, { layout: true, duration: 300, easing: 'linear' }]],
                ),
              ]),
              [[vAnimate, { initial: { scale: 0.5, opacity: 0 }, duration: 500 }]],
            )
          : null,
      ]),
  })
  await frame()
  const check = async (label: string) => {
    open.value = true
    await nextTick()
    const child = document.querySelector<HTMLElement>('#layout-child')!
    let runs = 0
    const s = sampler(() => (runs = Math.max(runs, layoutRuns(child).length)))
    await wait(150)
    s.stop()
    // Make sure the container really is appearing.
    expect(
      opacityOf(document.querySelector('.card')!),
      `${label}: container mid-appearance`,
    ).toBeLessThan(1)
    expect.soft(runs, `${label}: ui-layout runs on the child`).toBe(0)
    const style = getComputedStyle(child)
    expect.soft(['none', '0px', '0px 0px']).toContain(style.translate)
    expect.soft(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(style.transform)
  }
  await check('first open')
  await wait(600)
  open.value = false
  await wait(600)
  await check('second open')
  await wait(600)
  width.value = 80
  await nextTick()
  await frame()
  const child = document.querySelector('#layout-child')!
  expect(layoutRuns(child)).toHaveLength(1)
  expect(
    numbers(
      String((layoutRuns(child)[0]!.effect as KeyframeEffect).getKeyframes()[0]!.translate),
    )[0],
  ).toBeCloseTo(-60, 0)
})

test("30: a mutation during a slide that doesn't move the element keeps the same slide running", async () => {
  const gap = shallowRef(0)
  const label = shallowRef('one')
  const mark = shallowRef(false)
  render({
    setup: () => () =>
      h(
        'div',
        {
          class: 'grid',
          'data-x': mark.value ? '1' : undefined,
          style: `display: grid; gap: ${gap.value}px`,
        },
        [
          h('div', { style: 'height: 20px; width: 100px; overflow: hidden' }, label.value),
          withDirectives(h('div', { class: 'mover', style: 'height: 20px' }), [
            [vAnimate, { layout: true, duration: 600, easing: 'linear' }],
          ]),
        ],
      ),
  })
  await frame()
  const mover = document.querySelector<HTMLElement>('.mover')!
  const grid = document.querySelector<HTMLElement>('.grid')!
  const s = sampler(() => mover.getBoundingClientRect().top - grid.getBoundingClientRect().top)
  gap.value = 40
  await nextTick()
  await frame()
  const run = layoutRuns(mover)[0]
  expect(run).toBeDefined()
  await wait(200)
  label.value = 'two'
  await wait(100)
  mark.value = true
  await wait(100)
  const runs = layoutRuns(mover)
  expect.soft(runs).toHaveLength(1)
  expect.soft(runs[0] === run, 'the same Animation object').toBe(true)
  expect.soft(run!.playState).toBe('running')
  expect.soft(Number(run!.currentTime)).toBeGreaterThanOrEqual(300)
  await wait(400)
  const tops = s.stop().map((x) => x.v)
  expect.soft(Math.max(...deltas(tops))).toBeLessThan(40 * 0.15)
  expect.soft(tops.at(-1)).toBeCloseTo(60, 0)
})

test('31: a layout change undone at once (next microtask, or next task before a frame) shows no movement', async () => {
  render({
    setup: () => () =>
      h('div', { class: 'row', style: 'position: relative' }, [
        withDirectives(
          h('div', { id: 'box', style: 'margin-left: 200px; width: 40px; height: 20px' }),
          [[vAnimate, { layout: true, duration: 300, easing: 'linear' }]],
        ),
      ]),
  })
  await frame()
  const box = document.querySelector<HTMLElement>('#box')!
  const row = document.querySelector<HTMLElement>('.row')!
  const left = () => box.getBoundingClientRect().left - row.getBoundingClientRect().left
  const offsets = () =>
    layoutRuns(box).map((run) =>
      Math.max(
        ...numbers(String((run.effect as KeyframeEffect).getKeyframes()[0]!.translate)).map(
          Math.abs,
        ),
      ),
    )
  for (const undo of ['microtask', 'task'] as const) {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => {
        box.style.marginLeft = '0px'
        const back = () => {
          box.style.marginLeft = '200px'
          resolve()
        }
        if (undo === 'microtask') queueMicrotask(back)
        else setTimeout(back, 0)
      }),
    )
    const s = sampler(() => ({ left: left(), offset: Math.max(0, ...offsets()) }))
    await wait(80)
    const out = s.stop()
    for (const { v } of out) {
      expect.soft(Math.abs(v.left - 200), `${undo}: left off 200`).toBeLessThan(0.5)
      expect.soft(v.offset, `${undo}: slide offset`).toBeLessThan(0.5)
    }
  }
})

test('32: reversing a layout slide turns around from where it shows, one run at a time, and settles at its start', async () => {
  const moved = shallowRef(false)
  render({
    setup: () => () =>
      h('div', { class: 'row', style: 'position: relative' }, [
        withDirectives(
          h('div', {
            id: 'box',
            style: { marginLeft: moved.value ? '200px' : '0px', width: '40px', height: '20px' },
          }),
          [[vAnimate, { layout: true, duration: 600, easing: 'linear' }]],
        ),
      ]),
  })
  await frame()
  const box = document.querySelector<HTMLElement>('#box')!
  const row = document.querySelector<HTMLElement>('.row')!
  const s = sampler(() => ({
    x: box.getBoundingClientRect().left - row.getBoundingClientRect().left,
    runs: layoutRuns(box).length,
  }))
  moved.value = true
  await wait(250)
  moved.value = false
  const flipAt = performance.now()
  await wait(1000)
  const out = s.stop()
  const [before, after] = around(out, flipAt)
  // It went somewhere before turning around.
  expect(before.x).toBeGreaterThan(40)
  expect.soft(Math.abs(after.x - before.x), 'step at the reversal (px)').toBeLessThanOrEqual(2)
  expect
    .soft(Math.max(...out.map((x) => x.v.runs)), 'ui-layout runs at once')
    .toBeLessThanOrEqual(1)
  const last = out.filter((x) => x.t > out.at(-1)!.t - 200).map((x) => x.v.x)
  expect
    .soft(Math.max(...last.map(Math.abs)), 'distance from its start over the last 200 ms')
    .toBeLessThan(0.5)
})

test('33: a gap that changes every frame keeps one slide per child, no jump, and every child lands within 300 ms of the last change', async () => {
  render({
    setup: () => () =>
      h(
        'div',
        {
          class: 'col',
          style: 'display: flex; flex-direction: column; gap: 0px; position: relative',
        },
        [0, 1, 2].map((i) =>
          withDirectives(h('div', { class: `c c-${i}`, style: 'height: 20px' }), [
            [vAnimate, { layout: true, duration: 300, easing: 'linear' }],
          ]),
        ),
      ),
  })
  await frame()
  const col = document.querySelector<HTMLElement>('.col')!
  const kids = [...document.querySelectorAll<HTMLElement>('.c')]
  const tops: number[][] = [[], [], []]
  let pileUp = 0
  await new Promise<void>((resolve) => {
    const start = performance.now()
    const tick = (now: number) => {
      // Read what this frame shows, then move the driver.
      kids.forEach((kid, i) => {
        tops[i]!.push(kid.getBoundingClientRect().top - col.getBoundingClientRect().top)
        pileUp = Math.max(pileUp, layoutRuns(kid).length)
      })
      const p = Math.min(1, (now - start) / 500)
      col.style.gap = `${100 * p}px`
      if (p < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
  const s = sampler(() => {
    kids.forEach((kid, i) => {
      tops[i]!.push(kid.getBoundingClientRect().top - col.getBoundingClientRect().top)
      pileUp = Math.max(pileUp, layoutRuns(kid).length)
    })
  })
  await wait(300)
  await frame()
  await frame()
  s.stop()
  expect.soft(pileUp, 'ui-layout runs on one child at once').toBeLessThanOrEqual(1)
  for (const i of [1, 2]) {
    const travel = i * 100
    expect
      .soft(Math.max(...deltas(tops[i]!)), `child ${i}: largest step`)
      .toBeLessThan(travel * 0.15)
  }
  kids.forEach((kid, i) => {
    expect.soft(layoutRuns(kid), `child ${i}: still sliding`).toHaveLength(0)
    expect
      .soft(kid.getBoundingClientRect().top - col.getBoundingClientRect().top)
      .toBeCloseTo(i * 120, 0)
  })
})

test('34: a layout child inside a sliding layout parent rides along without its own slide; when its own place moves too, it eases there once', async () => {
  const above = shallowRef(20)
  const inner = shallowRef(false)
  const look = { layout: true, duration: 600, easing: 'linear' }
  render({
    setup: () => () =>
      h('div', { class: 'wrap' }, [
        h('div', { style: { height: `${above.value}px` } }),
        withDirectives(
          h('div', { id: 'p' }, [
            inner.value ? h('div', { style: 'height: 20px' }) : null,
            withDirectives(h('span', { id: 'c', style: 'display: block; height: 20px' }, 'x'), [
              [vAnimate, look],
            ]),
          ]),
          [[vAnimate, look]],
        ),
      ]),
  })
  await frame()
  const p = document.querySelector<HTMLElement>('#p')!
  const c = document.querySelector<HTMLElement>('#c')!
  const rel = () => c.getBoundingClientRect().top - p.getBoundingClientRect().top
  const rel0 = rel()

  // Pass 1: only the parent moves.
  let parentSlid = false
  let childRuns = 0
  let s = sampler(() => {
    parentSlid ||= layoutRuns(p).length > 0
    childRuns = Math.max(childRuns, layoutRuns(c).length)
    return rel()
  })
  above.value = 80
  await wait(700)
  let out = s.stop().map((x) => x.v)
  expect(parentSlid).toBe(true)
  expect.soft(childRuns, 'pass 1: ui-layout runs on the child').toBe(0)
  expect
    .soft(Math.max(...out.map((v) => Math.abs(v - rel0))), 'pass 1: drift from the parent (px)')
    .toBeLessThanOrEqual(0.5)

  // Pass 2: the parent moves and the child moves 20px inside it, at once.
  s = sampler(rel)
  above.value = 140
  inner.value = true
  await wait(700)
  out = s.stop().map((x) => x.v)
  const backs = out.slice(1).filter((v, i) => v < out[i]! - 0.5)
  expect.soft(backs, 'pass 2: frames that went back').toEqual([])
  expect.soft(Math.max(...out), 'pass 2: overshoot').toBeLessThanOrEqual(rel0 + 20 + 0.5)
  expect.soft(Math.max(...deltas(out)), 'pass 2: largest step').toBeLessThan(20 * 0.15)
  expect.soft(out.at(-1)).toBeCloseTo(rel0 + 20, 0)
})

test("35: scrolling inside a scroll container isn't a layout move, whether measured by offsets or by boxes", async () => {
  const runs = [
    { name: 'positioned scroller', scroller: 'position: relative', presence: false, row: '' },
    { name: 'offsetParent outside the scroller', scroller: '', presence: false, row: '' },
    {
      name: 'box path (presence root, positioned row)',
      scroller: '',
      presence: true,
      row: 'position: relative',
    },
  ]
  for (const run of runs) {
    render({
      setup: () => () =>
        h(
          'div',
          {
            id: 'scrollable',
            'data-ui-presence': run.presence ? '' : undefined,
            style: `overflow: auto; height: 300px; ${run.scroller}`,
          },
          [
            h('div', { style: 'height: 100px' }),
            h('div', { class: 'row', style: run.row }, [
              withDirectives(h('div', { id: 'box', style: 'height: 20px' }), [
                [vAnimate, { layout: true, duration: 300, easing: 'linear' }],
              ]),
            ]),
            h('div', { style: 'height: 880px' }),
          ],
        ),
    })
    await frame()
    const scroller = document.querySelector<HTMLElement>('#scrollable')!
    const box = document.querySelector<HTMLElement>('#box')!
    const top = () => box.getBoundingClientRect().top - scroller.getBoundingClientRect().top
    expect(top()).toBeCloseTo(100, 0)
    scroller.scrollTop = 100
    await frame()
    await frame()
    expect.soft(top(), `${run.name}: after the scroll`).toBeCloseTo(0, 0)
    let slid = 0
    const s = sampler(() => {
      slid = Math.max(slid, layoutRuns(box).length)
      return top()
    })
    scroller.setAttribute('data-x', '1')
    await wait(150)
    const out = s.stop().map((x) => x.v)
    expect.soft(slid, `${run.name}: ui-layout runs`).toBe(0)
    expect
      .soft(Math.max(...out.map(Math.abs)), `${run.name}: top after the attribute change`)
      .toBeLessThan(0.5)
    document.body.innerHTML = ''
  }
})

// ─── Interruption, lists ─────────────────────────────────────────────────────

test('36: retargeting `animate` mid-way continues from the current value, on a duration and on a spring', async () => {
  const on = shallowRef(false)
  const timings = {
    linear: { duration: 600, easing: 'linear' },
    spring: { spring: { damping: 0.8, response: 0.5 } },
  }
  const kind = shallowRef<keyof typeof timings>('linear')
  render({
    setup: () => () =>
      h('div', { class: 'stage', style: 'position: relative' }, [
        withDirectives(
          h('div', { key: kind.value, class: 'mover', style: 'width: 20px; height: 20px' }),
          [[vAnimate, { animate: { x: on.value ? 200 : 0 }, ...timings[kind.value] }]],
        ),
      ]),
  })
  for (const which of ['linear', 'spring'] as const) {
    kind.value = which
    await wait(300)
    const mover = document.querySelector<HTMLElement>('.mover')!
    const stage = document.querySelector<HTMLElement>('.stage')!
    const s = sampler(() => mover.getBoundingClientRect().left - stage.getBoundingClientRect().left)
    on.value = true
    await wait(250)
    on.value = false
    const flipAt = performance.now()
    await wait(1500)
    const out = s.stop()
    const xs = out.map((x) => x.v)
    const [before, after] = around(out, flipAt)
    expect(Math.max(...xs), `${which}: it went out`).toBeGreaterThan(40)
    expect
      .soft(Math.abs(after - before), `${which}: step at the reversal (px)`)
      .toBeLessThanOrEqual(2)
    expect.soft(Math.max(...deltas(xs)), `${which}: largest step (px)`).toBeLessThan(200 * 0.15)
    expect.soft(Math.abs(xs.at(-1)!), `${which}: where it ends`).toBeLessThan(0.5)
    expect.soft(['none', '0px', '0px 0px']).toContain(getComputedStyle(mover).translate)
  }
})

test('37: rows that mount together stagger 100 ms apart; a row added a second later appears at once, not after its index', async () => {
  const items = shallowRef<number[]>([])
  render({
    setup: () => () =>
      h(
        'ul',
        items.value.map((i) =>
          withDirectives(h('li', { key: i, class: `row row-${i}` }, `Row ${i}`), [
            [vAnimate, { initial: { opacity: 0 }, stagger: 0.1, duration: 200 }, 'rows'],
          ]),
        ),
      ),
  })
  await frame()
  const started: Record<number, number> = {}
  const watchRows = () =>
    sampler(() => {
      for (const row of document.querySelectorAll<HTMLElement>('.row')) {
        const i = Number(row.textContent!.slice(4))
        if (started[i] === undefined && opacityOf(row) > 0.05) started[i] = performance.now()
      }
    })
  let s = watchRows()
  items.value = [1, 2, 3, 4, 5]
  await wait(1000)
  s.stop()
  const firsts = [1, 2, 3, 4, 5].map((i) => started[i])
  expect(firsts.every((t) => t !== undefined)).toBe(true)
  const gaps = deltas(firsts as number[])
  for (const gap of gaps)
    expect.soft(Math.abs(gap - 100), `gaps ${gaps.map(Math.round)}`).toBeLessThanOrEqual(25)

  s = watchRows()
  const pushedAt = performance.now()
  items.value = [...items.value, 6]
  await wait(400)
  s.stop()
  expect(started[6]).toBeDefined()
  expect(started[6]! - pushedAt, 'ms until row 6 shows').toBeLessThanOrEqual(2 * 17 + 50)
})
