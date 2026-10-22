// What the showcase demos exposed: SVG arrivals, their delay, the runtime fallback, swaps, select.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, withDirectives } from 'vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import Menu from '../src/components/Menu/Menu.vue'
import Popover from '../src/components/Popover/Popover.vue'
import { vAnimate } from '../src/directives/vAnimate'

const real = { global: { stubs: { transition: false } } }
const frame = () => new Promise(requestAnimationFrame)
const opened = async () => {
  await vi.waitFor(() =>
    expect(document.querySelector('.ui-dialog-panel')?.getAnimations() ?? [1]).toHaveLength(0),
  )
  await new Promise((r) => setTimeout(r, 400))
}

afterEach(() => {
  document.body.innerHTML = ''
})

test('an SVG element joining an open dialog plays its appearance, after its delay', async () => {
  const shown = shallowRef(false)
  render(
    {
      setup: () => () =>
        h(Dialog as never, { open: true, title: 'Done' }, () =>
          shown.value
            ? h('svg', { viewBox: '0 0 10 10' }, [
                withDirectives(h('circle', { class: 'dot', cx: 5, cy: 5, r: 4 }), [
                  [vAnimate, { initial: { opacity: 0 }, delay: 0.2, duration: 200 }, 'dot'],
                ]),
              ])
            : null,
        ),
    },
    real,
  )
  await opened()
  shown.value = true
  await nextTick()
  await frame()
  const dot = document.querySelector<SVGElement>('.dot')!
  // Held at its start through the delay, then on its way.
  expect(Number(getComputedStyle(dot).opacity)).toBe(0)
  // Duration then delay: 200ms after a 200ms wait.
  const opacity = dot.style.transition
    .split(/,(?![^(]*\))/)
    .find((t) => t.trim().startsWith('opacity'))!
  expect(opacity.match(/\b[\d.]+m?s\b/g)).toEqual(['200ms', '200ms'])
  await vi.waitFor(() => expect(Number(getComputedStyle(dot).opacity)).toBe(1), { timeout: 2000 })
})

test("an arrival the CSS engine can't play (an SVG stroke drawing) goes to the runtime", async () => {
  const shown = shallowRef(false)
  render(
    {
      setup: () => () =>
        h(Dialog as never, { open: true, title: 'Done' }, () =>
          shown.value
            ? h('svg', { viewBox: '0 0 10 10' }, [
                withDirectives(h('path', { class: 'tick', d: 'M2 5l2 2 4-4', pathLength: 1 }), [
                  [vAnimate, { initial: { strokeDashoffset: 1 }, duration: 300 }, 'tick'],
                ]),
              ])
            : null,
        ),
    },
    real,
  )
  await opened()
  shown.value = true
  await vi.waitFor(() => {
    const tick = document.querySelector('.tick')!
    expect(tick.getAnimations().length).toBeGreaterThan(0)
  })
})

test('a swap: the view leaving keeps its width and goes the way `direction` says', async () => {
  const step = shallowRef(1)
  const direction = shallowRef<1 | -1>(1)
  const look = {
    initial: ({ direction: d }: { direction: number }) => ({ opacity: 0, x: 10 * d }),
    exit: ({ direction: d }: { direction: number }) => ({ opacity: 0, x: -10 * d }),
    duration: 400,
  }
  render(
    {
      setup: () => () =>
        h(
          Dialog as never,
          { open: true, title: 'Steps', motion: { swap: 'sync', direction: direction.value } },
          () =>
            withDirectives(
              h(
                'div',
                { key: step.value, class: `view view-${step.value}`, style: 'padding: 0 20px' },
                `Step ${step.value}`,
              ),
              [[vAnimate, look]],
            ),
        ),
    },
    real,
  )
  await opened()
  const before = document.querySelector<HTMLElement>('.view-1')!.getBoundingClientRect().width
  direction.value = -1
  step.value = 2
  await vi.waitFor(() => expect(document.querySelector('.view-2')).not.toBeNull())
  await vi.waitFor(() => expect(document.querySelector('.view-1')?.getAnimations().length).toBe(1))
  const leaving = document.querySelector<HTMLElement>('.view-1')!
  // Out of the flow, the same width (content-box padding not added twice).
  expect(leaving.getBoundingClientRect().width).toBeCloseTo(before, 0)
  // Going back: it leaves to the right.
  const end = (leaving.getAnimations()[0]!.effect as KeyframeEffect).getKeyframes().at(-1)!
  expect(String(end.translate)).toMatch(/^10px/)
})

test("a stagger as a function gives each its own start; select reaches a menu's rows", async () => {
  const open = shallowRef(false)
  render(
    {
      setup: () => () =>
        h(Menu as never, {
          open: open.value,
          items: [
            { label: 'One', value: 1 },
            { label: 'Two', value: 2 },
            { label: 'Three', value: 3 },
          ],
          motion: {
            targets: {
              rows: {
                select: '.ui-menu-item',
                initial: { opacity: 0 },
                duration: 200,
                // Last first.
                stagger: (i: number, n: number) => (n - 1 - i) * 0.05,
              },
            },
          },
        }),
    },
    real,
  )
  open.value = true
  await vi.waitFor(() =>
    expect(document.querySelectorAll('.ui-menu-item[data-ui-m]')).toHaveLength(3),
  )
  // The opacity transition's delay.
  const delays = [...document.querySelectorAll<HTMLElement>('.ui-menu-item')].map((row) => {
    const entry = row.style.transition
      .split(/,(?![^(]*\))/)
      .find((t) => t.trim().startsWith('opacity'))!
    // Duration, then delay; a zero delay is left out.
    const [, delay = '0ms'] = entry.match(/\b[\d.]+m?s\b/g) ?? []
    return Number.parseFloat(delay) * (delay.endsWith('ms') ? 1 : 1000)
  })
  expect(delays).toEqual([100, 50, 0])
})

test('layoutId: one element leaving and another arriving under it slides from the old box, both ways', async () => {
  const open = shallowRef(false)
  const look = { layoutId: 'reply', duration: 300, easing: 'linear' }
  render({
    setup: () => () =>
      h('div', [
        h('div', { style: 'height: 40px' }, [
          open.value
            ? null
            : withDirectives(h('button', { class: 'up' }, 'Reply'), [[vAnimate, look]]),
        ]),
        h('div', { style: 'height: 40px; padding-left: 100px' }, [
          open.value
            ? withDirectives(h('button', { class: 'down' }, 'Reply'), [[vAnimate, look]])
            : null,
        ]),
      ]),
  })
  await frame()
  const start = (selector: string) => {
    const run = document.querySelector(selector)!.getAnimations()[0]
    return run ? String((run.effect as KeyframeEffect).getKeyframes()[0]!.transform) : 'none'
  }
  open.value = true
  await vi.waitFor(() => expect(start('.down')).not.toBe('none'))
  // From 100px left and 40px up of where it lands.
  expect(start('.down')).toMatch(/^translate\(-100px, -40px\)/)
  await new Promise((r) => setTimeout(r, 400))
  open.value = false
  await vi.waitFor(() => expect(start('.up')).not.toBe('none'))
  expect(start('.up')).toMatch(/^translate\(100px, 40px\)/)
})

test('layoutId: a first arrival, with nothing leaving, appears as usual', async () => {
  const shown = shallowRef(false)
  render({
    setup: () => () =>
      h('div', [
        shown.value
          ? withDirectives(h('button', { class: 'alone' }, 'Hi'), [
              [vAnimate, { layoutId: 'nobody', initial: { opacity: 0 }, duration: 200 }],
            ])
          : null,
      ]),
  })
  await frame()
  shown.value = true
  await nextTick()
  await vi.waitFor(() =>
    expect(document.querySelector<HTMLElement>('.alone')!.style.transition).toContain('200ms'),
  )
})

test('v-animate.size clips only below its moving edge, so what slides in from above stays seen', async () => {
  const shown = shallowRef(false)
  render({
    setup: () => () =>
      withDirectives(
        h(
          'div',
          { 'data-testid': 'grow' },
          shown.value ? [h('p', { style: 'margin: 0' }, 'More')] : [],
        ),
        [[vAnimate, { duration: 300 }, undefined, { size: true }]],
      ),
  })
  await frame()
  shown.value = true
  await vi.waitFor(() => {
    const run = document.querySelector('[data-testid="grow"]')!.getAnimations()[0]!
    const clip = (run.effect as KeyframeEffect).getKeyframes()[0]!.clipPath
    // Open on three sides (the browser drops the left inset, equal to the right).
    expect(String(clip)).toMatch(/^inset\(-100vmax -100vmax 0(px)?( -100vmax)?\)$/)
  })
})

test('layout: an element slides to where layout puts it, from its place in its parent (scrolling is not a move)', async () => {
  const spread = shallowRef(false)
  render({
    setup: () => () =>
      h('div', { style: `display: grid; gap: ${spread.value ? 40 : 0}px; margin-top: 50px` }, [
        h('div', { style: 'height: 20px' }, 'A'),
        withDirectives(h('div', { class: 'moves', style: 'height: 20px' }, 'B'), [
          [vAnimate, { layout: true, duration: 300, easing: 'linear' }],
        ]),
      ]),
  })
  await frame()
  // The page scrolls first: no move of its own.
  document.documentElement.style.height = '3000px'
  window.scrollTo(0, 200)
  await frame()
  spread.value = true
  await vi.waitFor(() =>
    expect(document.querySelector('.moves')!.getAnimations().length).toBeGreaterThan(0),
  )
  const start = (
    document.querySelector('.moves')!.getAnimations()[0]!.effect as KeyframeEffect
  ).getKeyframes()[0]!.translate
  // From 40px higher (the gap it didn't have), nothing for the 200px scroll.
  expect(String(start)).toBe('0px -40px')
  window.scrollTo(0, 0)
  document.documentElement.style.height = ''
})

test('v-animate.size follows width too, when the content sets it (a pill)', async () => {
  const long = shallowRef(false)
  render({
    setup: () => () =>
      h('div', [
        withDirectives(
          h('span', { class: 'pill', style: 'display: inline-flex; white-space: nowrap' }, [
            h('span', long.value ? 'A much longer label' : 'Short'),
          ]),
          [[vAnimate, { duration: 300 }, undefined, { size: true }]],
        ),
      ]),
  })
  await frame()
  long.value = true
  await vi.waitFor(() => {
    const run = document.querySelector('.pill')!.getAnimations()[0]!
    expect((run.effect as KeyframeEffect).getKeyframes()[0]!.width).toBeDefined()
  })
})

test('v-animate.size: an attribute on the box itself (data-open) that rearranges it animates', async () => {
  const style = document.createElement('style')
  // Like a stack: the children keep their size, only their arrangement changes.
  style.textContent = '.box { display: grid } .box:not([data-open]) > div { grid-area: 1 / 1 }'
  document.head.append(style)
  const open = shallowRef(false)
  render({
    setup: () => () =>
      withDirectives(
        h('div', { class: 'box', 'data-open': open.value || undefined }, [
          h('div', { style: 'height: 20px' }),
          h('div', { style: 'height: 30px' }),
        ]),
        [[vAnimate, { duration: 300 }, undefined, { size: true }]],
      ),
  })
  await frame()
  // Past the observer's first report, which would see the change on its own.
  await frame()
  open.value = true
  await vi.waitFor(() =>
    expect(document.querySelector('.box')!.getAnimations().length).toBeGreaterThan(0),
  )
  style.remove()
})

test('replay: when its value changes, the element plays its initial again, without remounting', async () => {
  const activity = shallowRef('idle')
  render({
    setup: () => () =>
      withDirectives(h('div', { class: 'island' }, activity.value), [
        [vAnimate, { initial: { opacity: 0 }, replay: activity.value, duration: 300 }],
      ]),
  })
  await new Promise((r) => setTimeout(r, 500))
  const el = document.querySelector<HTMLElement>('.island')!
  expect(Number(getComputedStyle(el).opacity)).toBe(1)
  activity.value = 'call'
  await nextTick()
  await frame()
  // The same element, from its initial again.
  expect(document.querySelector('.island')).toBe(el)
  expect(Number(getComputedStyle(el).opacity)).toBeLessThan(0.5)
  await vi.waitFor(() => expect(Number(getComputedStyle(el).opacity)).toBe(1), { timeout: 2000 })
})

test("when: 'visible' holds its initial until it's scrolled into view, then appears once", async () => {
  render({
    setup: () => () =>
      h('div', [
        h('div', { style: 'height: 3000px' }),
        withDirectives(h('div', { class: 'below' }, 'Below'), [
          [vAnimate, { initial: { opacity: 0 }, when: 'visible', duration: 200 }],
        ]),
        // Room to scroll it well into view.
        h('div', { style: 'height: 3000px' }),
      ]),
  })
  await new Promise((r) => setTimeout(r, 300))
  const el = document.querySelector<HTMLElement>('.below')!
  expect(Number(getComputedStyle(el).opacity)).toBe(0)
  el.scrollIntoView()
  await vi.waitFor(() => expect(Number(getComputedStyle(el).opacity)).toBe(1), { timeout: 2000 })
  window.scrollTo(0, 0)
})

test("AnimatedNumber when: 'visible' holds its digits at 0 until seen; screen readers get the value", async () => {
  const { default: AnimatedNumber } =
    await import('../src/components/AnimatedNumber/AnimatedNumber.vue')
  render({
    setup: () => () =>
      h('div', [
        h('div', { style: 'height: 3000px' }),
        h(AnimatedNumber as never, { value: 42, motion: { when: 'visible' } }),
        h('div', { style: 'height: 3000px' }),
      ]),
  })
  await new Promise((r) => setTimeout(r, 300))
  const digits = () =>
    [...document.querySelectorAll<HTMLElement>('.ui-animated-number-digit')].map((d) =>
      d.style.getPropertyValue('--ui-digit'),
    )
  expect(digits()).toEqual(['0', '0'])
  expect(document.querySelector('.ui-animated-number-text')!.textContent).toBe('42')
  document.querySelector('.ui-animated-number')!.scrollIntoView()
  await vi.waitFor(() => expect(digits()).toEqual(['4', '2']), { timeout: 2000 })
  window.scrollTo(0, 0)
})

test('a popover above its trigger keeps its bottom edge there while it eases to new content', async () => {
  const step = shallowRef(1)
  render(
    {
      setup: () => () =>
        h('div', { style: 'padding-top: 400px' }, [
          h(
            Popover as never,
            {
              open: true,
              openOnTriggerClick: true,
              side: 'top',
              motion: { swap: 'sync', duration: 300 },
            },
            {
              trigger: () => h('button', { class: 'trig' }, 'Open'),
              default: () =>
                h(
                  'div',
                  { key: step.value, class: `view view-${step.value}` },
                  h('div', { style: `height: ${step.value === 1 ? 160 : 40}px` }),
                ),
            },
          ),
        ]),
    },
    real,
  )
  const panel = () => document.querySelector<HTMLElement>('.ui-popover-panel')!
  const gap = () =>
    document.querySelector('.trig')!.getBoundingClientRect().top -
    panel().getBoundingClientRect().bottom
  // Opened: its entrance started and finished.
  await vi.waitFor(() => expect(panel().getAnimations().length).toBeGreaterThan(0))
  await vi.waitFor(() => expect(panel().getAnimations()).toHaveLength(0))
  const settled = gap()
  step.value = 2
  const heights = new Set<number>()
  for (let i = 0; i < 12; i++) {
    await frame()
    heights.add(Math.round(panel().getBoundingClientRect().height))
    // Every frame, not only once it lands.
    expect(gap()).toBeCloseTo(settled, 0)
  }
  // It did ease, through heights in between.
  expect(heights.size).toBeGreaterThan(3)
})

test('layout: an element with its own offset and scale slides by its layout move only, onto them', async () => {
  const spread = shallowRef(false)
  render({
    setup: () => () =>
      h('div', { style: `display: grid; gap: ${spread.value ? 40 : 0}px` }, [
        h('div', { style: 'height: 20px' }, 'A'),
        withDirectives(
          h(
            'div',
            {
              class: 'moves',
              style: `height: 20px; translate: 0 ${spread.value ? 0 : 10}px; scale: ${spread.value ? 1 : 0.9}`,
            },
            'B',
          ),
          [[vAnimate, { layout: true, duration: 300, easing: 'linear' }]],
        ),
      ]),
  })
  await frame()
  spread.value = true
  const el = () => document.querySelector<HTMLElement>('.moves')!
  await vi.waitFor(() => expect(el().getAnimations().length).toBeGreaterThan(0))
  const run = el().getAnimations()[0]!
  // Its own translate and scale changing aren't its move; the slide adds onto them.
  expect(String((run.effect as KeyframeEffect).getKeyframes()[0]!.translate)).toBe('0px -40px')
  expect((run.effect as KeyframeEffect).composite).toBe('add')
})

test('removed by v-if, it leaves in place: back the way it came, quieter, then is gone', async () => {
  const shown = shallowRef(true)
  const look = shallowRef<Record<string, unknown>>({ initial: { opacity: 0, y: 8, blur: 2 } })
  render({
    setup: () => () =>
      h('div', { class: 'holder', style: 'position: relative; padding: 20px' }, [
        h('p', 'Stays'),
        shown.value
          ? withDirectives(h('p', { class: 'goes' }, 'Goes'), [[vAnimate, look.value]])
          : null,
      ]),
  })
  await vi.waitFor(() => expect(document.querySelector('.goes')!.getAnimations()).toHaveLength(0))
  const box = document.querySelector('.goes')!.getBoundingClientRect()
  shown.value = false
  await vi.waitFor(() => expect(document.querySelector('.goes')?.getAnimations().length).toBe(1))
  const ghost = document.querySelector<HTMLElement>('.goes')!
  // Where it was, out of the flow, hidden from assistive tech.
  // (Already on its way: within its 4px drift.)
  expect(ghost.getBoundingClientRect().top - box.top).toBeGreaterThanOrEqual(-0.5)
  expect(ghost.getBoundingClientRect().top - box.top).toBeLessThanOrEqual(4.5)
  expect(ghost.getBoundingClientRect().left).toBeCloseTo(box.left, 0)
  expect(ghost.getAttribute('aria-hidden')).toBe('true')
  const end = (ghost.getAnimations()[0]!.effect as KeyframeEffect).getKeyframes().at(-1)!
  expect(end.opacity).toBe('0')
  expect(String(end.translate)).toBe('0px 4px')
  await vi.waitFor(() => expect(document.querySelector('.goes')).toBeNull())

  // `exit: false`: gone at once.
  look.value = { initial: { opacity: 0 }, exit: false }
  shown.value = true
  await vi.waitFor(() => expect(document.querySelector('.goes')).not.toBeNull())
  shown.value = false
  await nextTick()
  await frame()
  expect(document.querySelector('.goes')).toBeNull()
})

test('a popover easing wider for new text keeps that text on its final line the whole way', async () => {
  const text = shallowRef('Was it helpful?')
  render(
    {
      setup: () => () =>
        h(
          Popover as never,
          { open: true, motion: { duration: 300 } },
          {
            trigger: () => h('button', 'Open'),
            default: () => h('p', { class: 'said', style: 'margin: 0' }, text.value),
          },
        ),
    },
    real,
  )
  const panel = () => document.querySelector<HTMLElement>('.ui-popover-panel')!
  const said = () => document.querySelector<HTMLElement>('.said')!
  await vi.waitFor(() => expect(panel().getAnimations().length).toBeGreaterThan(0))
  await vi.waitFor(() => expect(panel().getAnimations()).toHaveLength(0))
  text.value = 'Thanks for the feedback, it helps a lot!'
  const widths = new Set<number>()
  const lines = new Set<number>()
  for (let i = 0; i < 12; i++) {
    await frame()
    widths.add(Math.round(panel().getBoundingClientRect().width))
    lines.add(said().getBoundingClientRect().height)
  }

  // It did ease wider, through widths in between.
  expect(widths.size).toBeGreaterThan(3)
  await vi.waitFor(() => expect(panel().getAnimations()).toHaveLength(0))
  expect(said().style.inlineSize).toBe('')
  // And the text sat in its final wrap on every one of those frames.
  expect([...lines]).toEqual([said().getBoundingClientRect().height])
})
