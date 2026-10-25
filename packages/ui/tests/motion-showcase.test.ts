// What the showcase demos exposed: SVG arrivals, their delay, the runtime fallback, swaps, select.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, withDirectives } from 'vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import Menu from '../src/components/Menu/Menu.vue'
import Popover from '../src/components/Popover/Popover.vue'
import { vAnimate } from '../src/motion/vAnimate'

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

test('layoutId: it slides from where it was painted, though a row inserted above it in the same flush moved it', async () => {
  const sent = shallowRef<string[]>(['a'])
  const draft = shallowRef(true)
  const box = 'display: block; width: 100px; height: 30px'
  const look = (id: string) => ({ layoutId: id, duration: 300, easing: 'linear' })
  render({
    setup: () => () =>
      h('div', [
        // The thread, then the composer: the thread is patched first.
        h(
          'div',
          sent.value.map((id) =>
            withDirectives(h('b', { key: id, class: `m-${id}`, style: box }, id), [
              [vAnimate, look(id)],
            ]),
          ),
        ),
        h('div', [
          draft.value
            ? withDirectives(h('i', { style: `${box}; margin-left: 50px` }, 'b'), [
                [vAnimate, look('b')],
              ])
            : null,
        ]),
      ]),
  })
  await frame()
  sent.value = [...sent.value, 'b']
  draft.value = false
  const run = () => document.querySelector('.m-b')?.getAnimations()[0]
  await vi.waitFor(() => expect(run()).toBeTruthy())
  // Painted 50px right of where the message lands, on the same line: not 30px lower.
  expect(String((run()!.effect as KeyframeEffect).getKeyframes()[0]!.transform)).toMatch(
    /^translate\(50px, 0px\)/,
  )
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

test('replay mid-flight starts over from its initial, as a fromTo does', async () => {
  const spins = shallowRef(0)
  render({
    setup: () => () =>
      withDirectives(h('div', { class: 'word' }, String(spins.value)), [
        [vAnimate, { initial: { y: 100 }, replay: spins.value, duration: 600, easing: 'linear' }],
      ]),
  })
  await new Promise((r) => setTimeout(r, 800))
  const el = document.querySelector<HTMLElement>('.word')!
  const y = () => Number.parseFloat(getComputedStyle(el).translate.split(' ')[1] ?? '0')
  spins.value++
  await nextTick()
  await new Promise((r) => setTimeout(r, 300))
  // Halfway down, spun again: back to its start, not on from where it was.
  expect(y()).toBeLessThan(80)
  spins.value++
  await nextTick()
  await frame()
  expect(y()).toBeGreaterThan(90)
  await vi.waitFor(() => expect(y()).toBe(0), { timeout: 2000 })
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

test('content that changes while a popover is still opening eases to its new size too', async () => {
  const step = shallowRef(1)
  render(
    {
      setup: () => () =>
        h(
          Popover as never,
          { open: true, motion: { swap: 'sync', duration: 300 } },
          {
            trigger: () => h('button', 'Open'),
            default: () =>
              h(
                'div',
                { key: step.value },
                h('div', { style: `height: ${step.value === 1 ? 160 : 40}px` }),
              ),
          },
        ),
    },
    real,
  )
  const panel = () => document.querySelector<HTMLElement>('.ui-popover-panel')!
  await vi.waitFor(() => expect(panel().getAnimations().length).toBeGreaterThan(0))
  await new Promise((r) => setTimeout(r, 120))
  step.value = 2
  // Its layout height, which the entrance's scale doesn't touch.
  const heights = new Set<number>()
  for (let i = 0; i < 12; i++) {
    await frame()
    heights.add(panel().offsetHeight)
  }
  expect(heights.size).toBeGreaterThan(3)
})

test('a change inside a popover mid-entrance that keeps its size starts no resize, though it is scaled', async () => {
  render(
    {
      setup: () => () =>
        h(
          Popover as never,
          { open: true, motion: { initial: { panel: { scale: 0.5 } }, duration: 600 } },
          {
            trigger: () => h('button', 'Open'),
            default: () => h('div', { class: 'content', style: 'height: 120px' }),
          },
        ),
    },
    real,
  )
  const panel = () => document.querySelector<HTMLElement>('.ui-popover-panel')!
  await vi.waitFor(() => expect(panel().getAnimations().length).toBeGreaterThan(0))
  await new Promise((r) => setTimeout(r, 150))
  document.querySelector('.content')!.setAttribute('data-touched', '')
  for (let i = 0; i < 4; i++) await frame()
  expect(
    panel()
      .getAnimations()
      .filter((a) => a.id === 'ui-size'),
  ).toHaveLength(0)
})

test('layout: an element whose own offset drops as it moves slides from where it showed, onto its look', async () => {
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
  // Its own offset dropping with the move (10px, no transition) is where it showed: the slide
  // starts there, 40px up less those 10, so it doesn't jump. It adds onto its own look.
  expect(String((run.effect as KeyframeEffect).getKeyframes()[0]!.translate)).toBe('0px -30px')
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
  // Its entrance played and finished: it rests where layout put it.
  await vi.waitFor(() => expect(document.querySelector('.goes')!.getAnimations()).toHaveLength(0))
  await new Promise((r) => setTimeout(r, 600))
  expect(getComputedStyle(document.querySelector('.goes')!).translate).toBe('none')
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

test('a clip-path wipe in plays on the CSS engine, ending unclipped', async () => {
  render({
    setup: () => () =>
      withDirectives(h('div', { class: 'wipe' }, 'Wipe'), [
        [vAnimate, { initial: { clipPath: 'inset(0px 100% 0px 0px)' }, duration: 400 }],
      ]),
  })
  const el = () => document.querySelector<HTMLElement>('.wipe')!
  await vi.waitFor(() =>
    expect(
      el()
        .getAnimations()
        .some((a) => (a as CSSTransition).transitionProperty === 'clip-path'),
    ).toBe(true),
  )
  await vi.waitFor(() => expect(getComputedStyle(el()).clipPath).toBe('none'), { timeout: 2000 })
})

test('runtime engine: keyframe arrays play through, and a clip wipes to its rest', async () => {
  render({
    setup: () => () => [
      withDirectives(h('div', { class: 'burst' }, 'Burst'), [
        [vAnimate, { initial: { scale: [1, 1.6, 1] }, duration: 400 }],
      ]),
      // A keyframe array beside it sends the clip to the runtime too.
      withDirectives(h('div', { class: 'clip' }, 'Clip'), [
        [
          vAnimate,
          { initial: { clipPath: 'inset(0px 100% 0px 0px)', opacity: [0, 1] }, duration: 400 },
        ],
      ]),
    ],
  })
  const burst = () => document.querySelector<HTMLElement>('.burst')!
  const clip = () => document.querySelector<HTMLElement>('.clip')!
  const clipRun = () =>
    clip()
      .getAnimations()
      .find((a) => (a.effect as KeyframeEffect).getKeyframes().some((k) => k.clipPath))
  await vi.waitFor(() => expect(clipRun()).toBeTruthy())
  expect((clipRun()!.effect as KeyframeEffect).getKeyframes().at(-1)!.clipPath).toBe('inset(0px)')
  let most = 0
  while (burst().getAnimations().length) {
    most = Math.max(most, Number(getComputedStyle(burst()).scale))
    await frame()
  }
  expect(most).toBeGreaterThan(1.3)
})

test('runtime engine: a part leaving from height auto starts from its measured height', async () => {
  const open = shallowRef(true)
  render(
    {
      setup: () => () =>
        h(Dialog as never, {
          open: open.value,
          title: 'Height',
          motion: { exit: { panel: { height: 0, opacity: 0 } } },
        }),
    },
    real,
  )
  await opened()
  const panel = document.querySelector<HTMLElement>('.ui-dialog-panel')!
  open.value = false
  await vi.waitFor(() => expect(panel.getAnimations().length).toBeGreaterThan(0))
  const frames = panel
    .getAnimations()
    .map((a) => (a.effect as KeyframeEffect).getKeyframes())
    .find((list) => list.some((k) => k.height))!
  // Its start is written out, measured: an implicit `auto` can't interpolate to 0.
  expect(frames[0]!.height).toMatch(/^[1-9]\d*(\.\d+)?px$/)
  expect(frames.at(-1)!.height).toBe('0px')
})

test('elements under one name keep their own delay and look; exit: false leaves at once', async () => {
  const open = shallowRef(false)
  render(
    {
      setup: () => () =>
        h(Dialog as never, { open: open.value, title: 'Days' }, () =>
          [0, 0.3].map((delay, i) =>
            withDirectives(h('span', { class: `day day-${i}` }, String(i)), [
              [vAnimate, { initial: { opacity: 0, y: i ? 20 : 4 }, delay, exit: false }, 'day'],
            ]),
          ),
        ),
    },
    real,
  )
  open.value = true
  const day = (i: number) => document.querySelector<HTMLElement>(`.day-${i}`)!
  await vi.waitFor(() => expect(day(1)?.style.transition).toContain('ms'))
  const delayOf = (i: number) =>
    // A zero delay isn't written out.
    day(i).style.transition.match(/translate \d+ms (?:linear\([^)]*\)|[^ ,]+)(?: (\d+)ms)?/)?.[1] ??
    '0'
  expect(delayOf(0)).toBe('0')
  expect(delayOf(1)).toBe('300')
  await opened()
  const leaving = day(0)
  open.value = false
  await new Promise((r) => setTimeout(r, 120))
  if (leaving.isConnected) expect(Number(getComputedStyle(leaving).opacity)).toBe(1)
})

test('on its own, a value in its exit with its own timing leaves on it', async () => {
  const shown = shallowRef(true)
  render({
    setup: () => () =>
      h('div', [
        shown.value
          ? withDirectives(h('s', { class: 'strike' }, 'Done'), [
              [
                vAnimate,
                {
                  initial: { opacity: 0 },
                  exit: { scale: { value: '0 1', duration: 500, delay: 0.1 }, opacity: 0 },
                },
              ],
            ])
          : null,
      ]),
  })
  await new Promise((r) => setTimeout(r, 400))
  shown.value = false
  await vi.waitFor(() =>
    expect(document.querySelector('.strike')?.getAnimations().length).toBeGreaterThan(1),
  )
  const timings = document
    .querySelector('.strike')!
    .getAnimations()
    .map((a) => a.effect!.getTiming())
  expect(timings).toContainEqual(expect.objectContaining({ duration: 500, delay: 100 }))
})

test("a clip wipe ends on the element's own clip from its CSS, not on no inset", async () => {
  const style = document.createElement('style')
  style.textContent = '.shadowed { clip-path: inset(-48px); }'
  document.head.append(style)
  render({
    setup: () => () =>
      withDirectives(h('div', { class: 'shadowed' }, 'Panel'), [
        [vAnimate, { initial: { clipPath: 'inset(0px 0px 100% 0px)' }, duration: 300 }],
      ]),
  })
  const el = () => document.querySelector<HTMLElement>('.shadowed')!
  await vi.waitFor(() => expect(el().style.transition).toContain('clip-path'))
  // Nothing written over its own: the wipe heads for inset(-48px).
  expect(el().style.clipPath).toBe('')
  style.remove()
})

test('a fade or colour alone keeps the duration and easing you gave it', async () => {
  render({
    setup: () => () =>
      withDirectives(h('div', { class: 'flash' }, 'Saved'), [
        [
          vAnimate,
          { initial: { backgroundColor: 'rgb(255, 0, 0)' }, duration: 800, easing: 'linear' },
        ],
      ]),
  })
  const el = () => document.querySelector<HTMLElement>('.flash')!
  await vi.waitFor(() => expect(el().style.transition).toContain('background-color'))
  expect(el().style.transition).toMatch(/background-color 800ms linear/)
})

test('replayed together, siblings under one name stagger as they did when they appeared', async () => {
  const n = shallowRef(0)
  render({
    setup: () => () =>
      h(
        'ul',
        [0, 1, 2].map((i) =>
          withDirectives(h('li', { class: `row row-${i}` }, String(i)), [
            [vAnimate, { initial: { opacity: 0, y: 8 }, stagger: 0.1, replay: n.value }, 'rows'],
          ]),
        ),
      ),
  })
  await new Promise((r) => setTimeout(r, 800))
  n.value++
  const row = (i: number) => document.querySelector<HTMLElement>(`.row-${i}`)!
  await vi.waitFor(() => expect(row(2).style.transition).toContain('ms'))
  expect(row(2).style.transition).toMatch(/ 200ms/)
})

test("an icon's own <svg> plays its exit when removed", async () => {
  const shown = shallowRef(true)
  render({
    setup: () => () =>
      h('div', [
        shown.value
          ? withDirectives(
              h('svg', { class: 'icon', viewBox: '0 0 10 10', width: 20, height: 20 }),
              [[vAnimate, { exit: { opacity: 0 }, duration: 300 }]],
            )
          : null,
      ]),
  })
  await frame()
  shown.value = false
  await nextTick()
  await frame()
  const icon = document.querySelector('.icon')
  expect(icon).not.toBeNull()
  expect(icon!.getAnimations().length).toBeGreaterThan(0)
})

test('runtime engine: a custom property animates, and a non-moving value keeps the duration you gave', async () => {
  render({
    setup: () => () =>
      // A keyframe array beside them sends them to the runtime.
      withDirectives(h('div', { class: 'count', style: '--n: 38' }, 'Count'), [
        [
          vAnimate,
          {
            initial: { '--n': 0, inlineSize: '0%', opacity: [0, 1] },
            duration: 700,
            easing: 'linear',
          },
        ],
      ]),
  })
  const el = () => document.querySelector<HTMLElement>('.count')!
  await vi.waitFor(() => expect(el().getAnimations().length).toBeGreaterThan(0))
  const runs = el()
    .getAnimations()
    .map((a) => ({
      keys: (a.effect as KeyframeEffect).getKeyframes().flatMap((k) => Object.keys(k)),
      duration: a.effect!.getTiming().duration,
    }))
  const custom = runs.find((r) => r.keys.includes('--n'))
  expect(custom).toBeTruthy()
  expect(runs.find((r) => r.keys.includes('inlineSize'))!.duration).toBe(700)
})

test('a replay that needs the runtime never blinks the element out while it loads', async () => {
  const n = shallowRef(0)
  render({
    setup: () => () =>
      withDirectives(h('div', { class: 'orb' }, 'Orb'), [
        [vAnimate, { initial: { scale: [1, 1.3, 1] }, duration: 300, replay: n.value }],
      ]),
  })
  const el = () => document.querySelector<HTMLElement>('.orb')!
  await new Promise((r) => setTimeout(r, 500))
  n.value++
  await nextTick()
  const hidden = el()
    .getAnimations()
    .some((a) => (a.effect as KeyframeEffect).getKeyframes().every((k) => k.opacity === '0'))
  expect(hidden).toBe(false)
})

test('reopened while it closes, a popover turns around from where it is, not from its start', async () => {
  const open = shallowRef(false)
  render(
    {
      setup: () => () =>
        h(
          Popover as never,
          {
            open: open.value,
            'onUpdate:open': (v: boolean) => (open.value = v),
            motion: {
              initial: { panel: { opacity: 0, scale: '0.9' } },
              exit: { panel: { opacity: { value: 0, duration: 600, easing: 'linear' } } },
              duration: 600,
            },
          },
          { trigger: () => h('button', 'Open'), default: () => h('p', 'Body') },
        ),
    },
    real,
  )
  const panel = () => document.querySelector<HTMLElement>('.ui-popover-panel')
  open.value = true
  await vi.waitFor(() => expect(panel()).not.toBeNull())
  await new Promise((r) => setTimeout(r, 800))
  open.value = false
  await new Promise((r) => setTimeout(r, 150))
  const before = Number(getComputedStyle(panel()!).opacity)
  expect(before).toBeGreaterThan(0.5)
  open.value = true
  await nextTick()
  const seen: number[] = []
  for (let i = 0; i < 3; i++) {
    await frame()
    seen.push(Number(getComputedStyle(panel()!).opacity))
  }
  // Partway faded when it turned: it carries on from there, never back to nothing.
  expect(Math.min(...seen)).toBeGreaterThan(before - 0.2)
})

test('animate: it holds a look from the start, and moves from where it is to each new one', async () => {
  const open = shallowRef(false)
  render({
    setup: () => () =>
      withDirectives(h('div', { class: 'orb' }, 'Orb'), [
        [
          vAnimate,
          {
            animate: { rotate: open.value ? 180 : 0, opacity: open.value ? 1 : 0.5 },
            duration: 300,
          },
        ],
      ]),
  })
  const el = () => document.querySelector<HTMLElement>('.orb')!
  // Shown in its look at once, before any frame: nothing flashes.
  expect(getComputedStyle(el()).opacity).toBe('0.5')
  await new Promise((r) => setTimeout(r, 100))
  expect(
    el()
      .getAnimations()
      .filter((a) => a.playState === 'running'),
  ).toHaveLength(0)
  expect(getComputedStyle(el()).opacity).toBe('0.5')
  open.value = true
  await nextTick()
  await new Promise((r) => setTimeout(r, 120))
  const mid = Number.parseFloat(getComputedStyle(el()).rotate)
  expect(mid).toBeGreaterThan(5)
  expect(mid).toBeLessThan(175)
  await vi.waitFor(() => expect(getComputedStyle(el()).rotate).toBe('180deg'), { timeout: 2000 })
  expect(getComputedStyle(el()).opacity).toBe('1')
})

test('appear: false: no entrance on mount; replay still plays it', async () => {
  const n = shallowRef(0)
  render({
    setup: () => () =>
      withDirectives(h('div', { class: 'quiet' }, 'Quiet'), [
        [vAnimate, { initial: { opacity: 0 }, appear: false, replay: n.value, duration: 300 }],
      ]),
  })
  const el = () => document.querySelector<HTMLElement>('.quiet')!
  await frame()
  await frame()
  expect(getComputedStyle(el()).opacity).toBe('1')
  n.value++
  await vi.waitFor(() => expect(Number(getComputedStyle(el()).opacity)).toBeLessThan(0.9))
})

test("layoutId with layout: 'position' travels at its own size: no stretch on the way", async () => {
  const sent = shallowRef(false)
  const look = { layoutId: 'msg', layout: 'position' as const, duration: 300 }
  render({
    setup: () => () =>
      h('div', [
        sent.value
          ? null
          : withDirectives(h('i', { style: 'display: block; width: 300px; height: 20px' }, 'Hi'), [
              [vAnimate, look],
            ]),
        sent.value
          ? withDirectives(
              h(
                'b',
                {
                  class: 'bubble',
                  style: 'display: block; width: 120px; height: 40px; margin-left: 80px',
                },
                'Hi',
              ),
              [[vAnimate, look]],
            )
          : null,
      ]),
  })
  await frame()
  sent.value = true
  const run = () => document.querySelector('.bubble')?.getAnimations()[0]
  await vi.waitFor(() => expect(run()).toBeTruthy())
  const start = String((run()!.effect as KeyframeEffect).getKeyframes()[0]!.transform)
  expect(start).toMatch(/^translate\(-80px, /)
  expect(start).toContain('scale(1, 1)')
})

test('layout inside a component panel: slot content glides when a row above it goes', async () => {
  const { default: Select } = await import('../src/components/Select/Select.vue')
  // Grouped, so each option keeps its element (a windowed list reuses rows by position).
  const all = [
    { label: 'One', value: 1 },
    { label: 'Two', value: 2 },
    { label: 'Three', value: 3 },
  ]
  const items = shallowRef([{ label: 'Numbers', items: all }])
  render(
    {
      setup: () => () =>
        h(
          Select as never,
          { open: true, items: items.value },
          {
            item: ({ item }: { item: { label: string } }) =>
              withDirectives(h('span', { class: `body body-${item.label}` }, item.label), [
                [vAnimate, { layout: true, duration: 300 }],
              ]),
          },
        ),
    },
    { global: { stubs: { transition: false } } },
  )
  await vi.waitFor(() => expect(document.querySelector('.body-Three')).not.toBeNull())
  await new Promise((r) => setTimeout(r, 400))
  items.value = [{ label: 'Numbers', items: all.slice(1) }]
  await vi.waitFor(() =>
    expect(document.querySelector('.body-Three')!.getAnimations().length).toBeGreaterThan(0),
  )
})

test('animate: a colour keeps the duration you gave the whole value', async () => {
  const on = shallowRef(false)
  render({
    setup: () => () =>
      withDirectives(h('div', { class: 'tint' }, 'Tint'), [
        [
          vAnimate,
          {
            animate: { backgroundColor: on.value ? 'rgb(255, 0, 0)' : 'rgb(0, 0, 255)' },
            duration: 700,
            easing: 'linear',
          },
        ],
      ]),
  })
  const el = () => document.querySelector<HTMLElement>('.tint')!
  await new Promise((r) => setTimeout(r, 100))
  on.value = true
  // Past the instant hold it got on mount: the change's own.
  const change = () =>
    el()
      .getAnimations()
      .find((a) => a.effect!.getTiming().duration !== 1)
  await vi.waitFor(() => expect(change()).toBeTruthy())
  expect(change()!.effect!.getTiming().duration).toBe(700)
})

test('layout: a change that moves nothing leaves a running glide alone', async () => {
  const first = shallowRef(true)
  const note = shallowRef('a')
  render({
    setup: () => () =>
      h('div', [
        first.value ? h('div', { style: 'height: 40px' }, 'First') : null,
        withDirectives(h('div', { class: 'mover', style: 'height: 20px' }, 'Mover'), [
          [vAnimate, { layout: true, duration: 600, easing: 'linear' }],
        ]),
        h('span', { 'data-note': note.value }, 'note'),
      ]),
  })
  const glide = () => document.querySelector('.mover')!.getAnimations()[0]
  await frame()
  first.value = false
  await vi.waitFor(() => expect(glide()).toBeTruthy())
  const running = glide()
  await new Promise((r) => setTimeout(r, 100))
  // Something else under the parent changes; the mover stays where layout has it.
  note.value = 'b'
  await nextTick()
  await frame()
  expect(glide()).toBe(running)
})

test("layout: 'position' with a layoutId: the travel isn't cut short by its own layout watch", async () => {
  const sent = shallowRef(false)
  const note = shallowRef('a')
  const look = { layoutId: 'trip', layout: 'position' as const, duration: 300 }
  render({
    setup: () => () =>
      h('div', [
        sent.value
          ? null
          : withDirectives(h('i', { style: 'display: block; width: 80px; height: 20px' }, 'Hi'), [
              [vAnimate, look],
            ]),
        h('div', { style: 'height: 60px', 'data-note': note.value }),
        sent.value
          ? withDirectives(
              h(
                'b',
                { class: 'arrived', style: 'display: block; width: 80px; height: 20px' },
                'Hi',
              ),
              [[vAnimate, look]],
            )
          : null,
      ]),
  })
  await frame()
  sent.value = true
  const travel = () => document.querySelector('.arrived')?.getAnimations()[0]
  await vi.waitFor(() => expect(travel()).toBeTruthy())
  const run = travel()!
  // Something else under the same parent changes while it travels.
  await new Promise((r) => setTimeout(r, 30))
  note.value = 'b'
  await new Promise((r) => setTimeout(r, 30))
  expect(run.playState).toBe('running')
})

test('progress holds animate keyframes at a point: a swipe scrubs them', async () => {
  const p = shallowRef(0)
  const to = shallowRef(100)
  render({
    setup: () => () =>
      withDirectives(h('div', { class: 'scrub' }, 'Scrub'), [
        [vAnimate, { animate: { x: [0, to.value], opacity: [0, 1] }, progress: p.value }],
      ]),
  })
  const el = () => document.querySelector<HTMLElement>('.scrub')!
  const x = () => Number.parseFloat(getComputedStyle(el()).translate.split(' ')[0] ?? '0')
  await vi.waitFor(() => expect(getComputedStyle(el()).opacity).toBe('0'))
  p.value = 0.5
  await vi.waitFor(() => expect(x()).toBeCloseTo(50, 0))
  expect(Number(getComputedStyle(el()).opacity)).toBeCloseTo(0.5, 2)
  p.value = 1
  await vi.waitFor(() => expect(x()).toBeCloseTo(100, 0))
  to.value = 200
  await vi.waitFor(() => expect(x()).toBeCloseTo(200, 0))
})

test('a replay that needs the runtime starts in the same task once the runtime is loaded', async () => {
  const n = shallowRef(0)
  render({
    setup: () => () =>
      withDirectives(h('div', { class: 'kick' }, 'Kick'), [
        [
          vAnimate,
          { initial: { scale: [1, 1.2, 1] }, duration: 300, replay: n.value, appear: false },
        ],
      ]),
  })
  const el = () => document.querySelector<HTMLElement>('.kick')!
  n.value++
  await vi.waitFor(() => expect(el().getAnimations().length).toBeGreaterThan(0))
  await new Promise((r) => setTimeout(r, 400))
  n.value++
  await nextTick()
  // Its appearance queue flushes in a microtask; nothing more.
  await Promise.resolve()
  await Promise.resolve()
  expect(
    el()
      .getAnimations()
      .some((a) => a.playState === 'running'),
  ).toBe(true)
})

test("layout: an element's own entrance isn't read as a move by its layout watch", async () => {
  const note = shallowRef('a')
  const shown = shallowRef(false)
  render(
    {
      setup: () => () =>
        h(Dialog as never, { open: true, title: 'Rows' }, () => [
          h('p', { 'data-note': note.value }, 'note'),
          h('div', { style: 'position: relative' }, [
            shown.value
              ? withDirectives(h('div', { class: 'arriving' }, 'Row'), [
                  [vAnimate, { initial: { y: 30 }, layout: true, duration: 600, easing: 'linear' }],
                ])
              : null,
          ]),
        ]),
    },
    real,
  )
  await opened()
  shown.value = true
  const row = () => document.querySelector<HTMLElement>('.arriving')!
  const glides = () =>
    row()
      .getAnimations()
      .filter((a) => a.id === 'ui-layout')
  await vi.waitFor(() => expect(row()).not.toBeNull())
  await new Promise((r) => setTimeout(r, 150))
  // Mid-entrance, something else in the panel changes: the row hasn't moved.
  note.value = 'b'
  await nextTick()
  await frame()
  expect(glides()).toHaveLength(0)
})

test('layout: a panel scaling up as it opens moves nothing inside it', async () => {
  render(
    {
      setup: () => () =>
        h(Dialog as never, { open: true, title: 'Rows' }, () =>
          h('div', { style: 'position: relative; margin-top: 160px' }, [
            withDirectives(h('div', { class: 'steady' }, 'Row'), [
              [vAnimate, { layout: true, duration: 600 }],
            ]),
          ]),
        ),
    },
    real,
  )
  await vi.waitFor(() => expect(document.querySelector('.steady')).not.toBeNull())
  const seen = new Set<Animation>()
  for (let i = 0; i < 30; i++) {
    for (const a of document.querySelector('.steady')!.getAnimations())
      if (a.id === 'ui-layout') seen.add(a)
    await frame()
  }
  expect(seen.size).toBe(0)
})

test('progress with a spring: the keyframes follow it a beat behind, then land on it', async () => {
  const p = shallowRef(0)
  render({
    setup: () => () =>
      withDirectives(h('div', { class: 'chase' }, 'Chase'), [
        [
          vAnimate,
          { animate: { x: [0, 100] }, progress: p.value, spring: { damping: 1, response: 0.3 } },
        ],
      ]),
  })
  const el = () => document.querySelector<HTMLElement>('.chase')!
  const x = () => Number.parseFloat(getComputedStyle(el()).translate.split(' ')[0] ?? '0') || 0
  await new Promise((r) => setTimeout(r, 200))
  p.value = 1
  await nextTick()
  await frame()
  await frame()
  const early = x()
  expect(early).toBeGreaterThan(0)
  expect(early).toBeLessThan(90)
  await vi.waitFor(() => expect(x()).toBeCloseTo(100, 0), { timeout: 2000 })
})

test("progress: a new spring takes over from the old one's place and speed", async () => {
  const p = shallowRef(0)
  const spring = shallowRef({ damping: 1, response: 2 })
  render({
    setup: () => () =>
      withDirectives(h('div', { class: 'swap' }, 'Swap'), [
        [vAnimate, { animate: { x: [0, 100] }, progress: p.value, spring: spring.value }],
      ]),
  })
  const el = () => document.querySelector<HTMLElement>('.swap')!
  const x = () => Number.parseFloat(getComputedStyle(el()).translate.split(' ')[0] ?? '0') || 0
  await new Promise((r) => setTimeout(r, 200))
  p.value = 1
  await new Promise((r) => setTimeout(r, 100))
  // Now a quick one: it lands soon, from where the slow one had it.
  const was = x()
  spring.value = { damping: 1, response: 0.1 }
  await nextTick()
  await frame()
  expect(x()).toBeGreaterThanOrEqual(was - 1)
  await vi.waitFor(() => expect(x()).toBeCloseTo(100, 0), { timeout: 600 })
})

test('removed mid-entrance, it leaves from the look it had, at its own size', async () => {
  const shown = shallowRef(true)
  render({
    setup: () => () =>
      h('div', { style: 'position: relative' }, [
        shown.value
          ? withDirectives(
              h(
                'div',
                { class: 'growing', style: 'width: 200px; height: 10px; transform-origin: left' },
                '',
              ),
              [
                [
                  vAnimate,
                  {
                    initial: { scale: '0 1' },
                    exit: { opacity: 0 },
                    duration: 800,
                    easing: 'linear',
                  },
                ],
              ],
            )
          : null,
      ]),
  })
  const el = () => document.querySelector<HTMLElement>('.growing')!
  await vi.waitFor(() => expect(el().getAnimations().length).toBeGreaterThan(0))
  await new Promise((r) => setTimeout(r, 300))
  const before = el().getBoundingClientRect().width
  shown.value = false
  await nextTick()
  await frame()
  const leaving = el()
  // Same look as a moment ago (not grown to full, not shrunk twice), on its own 200px box.
  expect(Math.abs(leaving.getBoundingClientRect().width - before)).toBeLessThan(20)
  expect(leaving.style.width).toBe('200px')
})

test('removed while still at its starting look: it leaves from where it was seen', async () => {
  // A still page: a leave during a scroll is skipped (a recycled row).
  window.scrollTo(0, 0)
  await new Promise((r) => setTimeout(r, 200))
  const shown = shallowRef(true)
  render({
    setup: () => () =>
      h('div', { class: 'holder', style: 'position: relative; padding: 20px' }, [
        h('p', 'Stays'),
        shown.value
          ? withDirectives(h('p', { class: 'goes' }, 'Goes'), [
              [vAnimate, { initial: { opacity: 0, y: 8, blur: 2 } }],
            ])
          : null,
      ]),
  })
  await nextTick()
  const el = document.querySelector<HTMLElement>('.goes')!
  const seen = el.getBoundingClientRect().top
  shown.value = false
  await nextTick()
  await new Promise(requestAnimationFrame)
  const ghost = document.querySelector<HTMLElement>('.goes')!
  expect(Math.abs(ghost.getBoundingClientRect().top - seen)).toBeLessThan(1)
})
