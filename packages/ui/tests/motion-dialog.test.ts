import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, withDirectives } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import { vAnimate } from '../src/directives/vAnimate'
import type { DialogMotion, MotionStyle } from '../src/motion/types'

// The runtime's own animations (hooks, steps); static motion is played by CSS transitions instead.
const ours = (el: Element | null) =>
  (el?.getAnimations() ?? []).filter((a) => a.id === 'ui-presence') as Animation[]
const panel = () => document.querySelector<HTMLElement>('.ui-dialog-panel')
const frame = () => new Promise(requestAnimationFrame)
// What's on screen, whichever engine plays it: opacity through every ancestor, and the offset.
const visible = (el: Element) => {
  let opacity = 1
  for (let node: Element | null = el; node; node = node.parentElement)
    opacity *= Number(getComputedStyle(node).opacity)
  return opacity
}
const offset = (el: Element) => {
  const [x = '0', y = '0'] = getComputedStyle(el).translate.split(' ')
  return { x: Number.parseFloat(x) || 0, y: Number.parseFloat(y) || 0 }
}
const scaleOf = (el: Element) => {
  const value = getComputedStyle(el).scale
  return value === 'none' ? 1 : Number.parseFloat(value)
}
/** When each element first shows (ms after the call), sampled every frame for `ms`. */
async function firstShown(els: Record<string, () => Element | null>, ms: number) {
  const t0 = performance.now()
  const seen: Record<string, number> = {}
  while (performance.now() - t0 < ms) {
    for (const [name, el] of Object.entries(els)) {
      const node = el()
      if (node && seen[name] === undefined && visible(node) > 0.05)
        seen[name] = performance.now() - t0
    }
    await frame()
  }
  return seen
}
// The test renderer stubs <Transition> unless told not to, and motion lives in its hooks.
const real = { global: { stubs: { transition: false } } }

afterEach(() => {
  document.body.innerHTML = ''
})

function dialog(
  motion: DialogMotion | undefined,
  slot?: (props: { target: (n: string) => (el: unknown) => void }) => unknown,
) {
  const open = shallowRef(false)
  const events: string[] = []
  const screen = render(
    {
      setup: () => () =>
        h(
          Dialog as never,
          {
            open: open.value,
            'onUpdate:open': (v: boolean) => (open.value = v),
            title: 'Orders',
            motion,
            onAfterEnter: () => events.push('after-enter'),
            onAfterLeave: () => events.push('after-leave'),
          },
          slot ? { default: slot } : undefined,
        ),
    },
    real,
  )
  return { open, events, screen }
}

test('{ spring } keeps the built-in look: it starts small and clear, and settles', async () => {
  const { open, events } = dialog({ spring: { damping: 0.8, response: 0.3 } })
  open.value = true
  await nextTick()
  // The first frame you can see (a painted one: the look applies within the same task, before paint):
  // still small, still faint (the built-in look, opacity 0 and scale 0.96).
  await frame()
  while (!panel() || visible(panel()!) < 0.02) await frame()
  expect(visible(panel()!)).toBeLessThan(0.6)
  expect(scaleOf(panel()!)).toBeLessThan(0.99)
  await vi.waitFor(() => expect(events).toContain('after-enter'))
  expect(visible(panel()!)).toBe(1)
  expect(scaleOf(panel()!)).toBe(1)
})

test('states by part replace the look, part by part', async () => {
  const { open } = dialog({ initial: { panel: { opacity: 0, y: 24 } } })
  open.value = true
  await nextTick()
  await frame()
  expect(offset(panel()!).y).toBeGreaterThan(12)
  // The overlay keeps its default fade.
  expect(visible(document.querySelector('.ui-dialog-overlay')!)).toBeLessThan(0.5)
  await vi.waitFor(() => expect(offset(panel()!).y).toBe(0), { timeout: 2000 })
})

test('closing is quick and quiet, then emits after-leave', async () => {
  const { open, events } = dialog({ spring: { damping: 0.3, response: 0.6 } })
  open.value = true
  await vi.waitFor(() => expect(events).toContain('after-enter'), { timeout: 3000 })
  const closedAt = performance.now()
  open.value = false
  await vi.waitFor(() => expect(events).toContain('after-leave'))
  // However slow the spring, a close is quick.
  expect(performance.now() - closedAt).toBeLessThan(400)
  expect(panel()).toBeNull()
})

test("the engine plays through inline styles, nothing !important, and puts back the panel's own", async () => {
  const open = shallowRef(false)
  render(
    {
      setup: () => () =>
        h(Dialog as never, {
          open: open.value,
          title: 'Orders',
          ui: { panel: { style: { scale: '1.02', transition: 'box-shadow 1s' } } },
        }),
    },
    real,
  )
  open.value = true
  await vi.waitFor(() => expect(panel()?.hasAttribute('data-ui-m')).toBe(true))
  await vi.waitFor(() => expect(panel()!.hasAttribute('data-ui-m')).toBe(false), { timeout: 3000 })
  // Settled: its own inline styles are back, the engine's are gone.
  expect(panel()!.style.scale).toBe('1.02')
  expect(panel()!.style.transition).toBe('box-shadow 1s')
  expect(panel()!.style.opacity).toBe('')
  // Closing holds the exit inline and not !important: an important value keeps it off the compositor.
  open.value = false
  await vi.waitFor(() => expect(panel()!.style.opacity).toBe('0'))
  expect(panel()!.style.getPropertyPriority('opacity')).toBe('')
})

test('motion: false opens and closes instantly', async () => {
  const { open, events } = dialog(false)
  open.value = true
  await nextTick()
  expect(ours(panel())).toHaveLength(0)
  await vi.waitFor(() => expect(events).toContain('after-enter'))
  open.value = false
  await vi.waitFor(() => expect(panel()).toBeNull())
})

test('targets chain with after: rows wait for the summary to arrive', async () => {
  const { open } = dialog(
    {
      targets: {
        summary: { initial: { opacity: 0 }, duration: 150 },
        rows: { initial: { opacity: 0, y: 6 }, after: 'summary', stagger: 0.03 },
      },
    },
    ({ target }) => [
      h('p', { ref: target('summary'), 'data-name': 'summary' }, 'summary'),
      ...['a', 'b'].map((r) => h('li', { ref: target('rows'), 'data-name': 'rows', key: r }, r)),
    ],
  )
  open.value = true
  const seen = await firstShown(
    {
      summary: () => document.querySelector('[data-name="summary"]'),
      rows: () => document.querySelector('[data-name="rows"]'),
    },
    700,
  )
  // Rows start only after the summary's 150ms arrival.
  expect(seen.rows! - seen.summary!).toBeGreaterThanOrEqual(110)
})

test('v-animate joins the dialog and plays its own initial', async () => {
  const { open } = dialog(undefined, () =>
    withDirectives(h('p', { 'data-testid': 'marked' }, 'hello'), [
      [vAnimate, { initial: { opacity: 0, x: -10 } }, 'hello'],
    ]),
  )
  // A directive alone doesn't switch Dialog to the runtime; a style or :motion does.
  render(
    { setup: () => () => h(ConfigProvider, { motion: { version: 1 } satisfies MotionStyle }) },
    real,
  )
  open.value = true
  await nextTick()
  const marked = () => document.querySelector('[data-testid="marked"]')
  await vi.waitFor(() => expect(marked()).not.toBeNull())
  expect(marked()!.isConnected).toBe(true)
})

test('a style on ConfigProvider reaches every dialog by role', async () => {
  const open = shallowRef(false)
  render(
    {
      setup: () => () =>
        h(
          ConfigProvider,
          {
            motion: {
              version: 1,
              overlay: { initial: { opacity: 0, y: 40 } },
            } satisfies MotionStyle,
          },
          () => h(Dialog as never, { open: open.value, title: 'Styled' }),
        ),
    },
    real,
  )
  open.value = true
  await nextTick()
  await frame()
  expect(offset(panel()!).y).toBeGreaterThan(20)
})

test('an enter hook is awaited; a throwing one finishes at once with a warning', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  let resolved = false
  const { open, events } = dialog({
    enter: ({ panel }) =>
      panel.animate([{ opacity: 0 }, { opacity: 1 }], 120).finished.then(() => (resolved = true)),
  })
  open.value = true
  await vi.waitFor(() => expect(events).toContain('after-enter'))
  expect(resolved).toBe(true)

  document.body.innerHTML = ''
  const broken = dialog({
    enter: () => {
      throw new Error('boom')
    },
  })
  broken.open.value = true
  await vi.waitFor(() => expect(broken.events).toContain('after-enter'))
  expect(warn.mock.calls.some(([m]) => String(m).includes('enter hook threw'))).toBe(true)
  warn.mockRestore()
})

test('closing before a waiting target plays keeps it hidden', async () => {
  const { open } = dialog(
    {
      targets: {
        rows: { initial: { opacity: 0 }, duration: 400 },
        total: { initial: { opacity: 0, scale: '0.9' }, after: 'rows' },
      },
    },
    ({ target }) => [
      h('li', { ref: target('rows') }, 'row'),
      h('strong', { ref: target('total'), 'data-testid': 'total' }, 'Total'),
    ],
  )
  open.value = true
  await nextTick()
  const total = () => document.querySelector<HTMLElement>('[data-testid="total"]')
  await vi.waitFor(() => expect(total()).not.toBeNull())
  // Close while the rows still play, so the total is still waiting its turn.
  await new Promise((resolve) => setTimeout(resolve, 150))
  open.value = false
  // Sample every frame of the close: the total never flashes in.
  let max = 0
  while (total()?.isConnected) {
    max = Math.max(max, Number(getComputedStyle(total()!).opacity))
    await new Promise(requestAnimationFrame)
  }
  expect(max).toBe(0)
})

test('an enter hook runs once per open', async () => {
  // The panel has v-if and v-show, so Vue calls the transition's enter twice for one entrance.
  let calls = 0
  const { open, events } = dialog({
    enter: ({ panel }) => {
      calls++
      return panel.animate([{ opacity: 0 }, {}], 80)
    },
  })
  open.value = true
  await vi.waitFor(() => expect(events).toContain('after-enter'))
  expect(calls).toBe(1)
})

test(
  'closing mid-enter stops a hook that never resolves, without waiting it out',
  { timeout: 8000 },
  async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // Like a killed GSAP timeline: stoppable, but its promise never settles.
    const { open, events } = dialog({
      // eslint-disable-next-line unicorn/no-thenable -- a thenable is the point: GSAP returns one
      enter: () => ({ then: () => {}, kill: () => {} }),
    })
    open.value = true
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 50))
    const closedAt = performance.now()
    open.value = false
    await vi.waitFor(() => expect(events).toContain('after-leave'))
    expect(performance.now() - closedAt).toBeLessThan(1000)
    // Past the 3s safety cap: the interrupted enter was let go, not waited out.
    await new Promise((resolve) => setTimeout(resolve, 3100))
    expect(warn.mock.calls.some(([m]) => String(m).includes("didn't finish"))).toBe(false)
    warn.mockRestore()
  },
)

test('a hook that only animates the panel leaves the backdrop its default fade', async () => {
  const { open, events } = dialog({
    enter: ({ panel }) => panel.animate([{ opacity: 0 }, {}], 120),
  })
  open.value = true
  await nextTick()
  const overlay = () => document.querySelector('.ui-dialog-overlay')
  await vi.waitFor(() => expect(ours(overlay()).length).toBeGreaterThan(0))
  await vi.waitFor(() => expect(events).toContain('after-enter'))
})

test('a hook owns the parts it reads; the others keep their default motion', async () => {
  // Reads only the panel, and starts late like GSAP's .to() or motion's animate().
  const { open, events } = dialog({
    enter: ({ panel }) =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          panel.animate([{ opacity: 0 }, {}], 80).finished.then(() => resolve()),
        ),
      ),
  })
  open.value = true
  await nextTick()
  await vi.waitFor(() =>
    expect(ours(document.querySelector('.ui-dialog-overlay')).length).toBeGreaterThan(0),
  )
  // The panel is the hook's: the runtime never animates it.
  expect(ours(panel())).toHaveLength(0)
  await vi.waitFor(() => expect(events).toContain('after-enter'))
})

test('a leave hook without fill holds its last frame until removal', async () => {
  const { open, events } = dialog({
    leave: ({ panel }) => panel.animate([{}, { opacity: 0 }], 120),
  })
  open.value = true
  await vi.waitFor(() => expect(events).toContain('after-enter'))
  open.value = false
  let max = 0
  let seenFade = false
  while (panel()) {
    const opacity = Number(getComputedStyle(panel()!).opacity)
    if (opacity < 0.5) seenFade = true
    if (seenFade) max = Math.max(max, opacity)
    await new Promise(requestAnimationFrame)
  }
  expect(seenFade).toBe(true)
  // Once faded it never snaps back.
  expect(max).toBeLessThan(0.5)
})

test("after: 'name:50%' starts halfway through the other target", async () => {
  const { open } = dialog(
    {
      targets: {
        summary: { initial: { opacity: 0 }, duration: 400, easing: 'linear' },
        rows: { initial: { opacity: 0 }, duration: 100, after: 'summary:50%' },
      },
    },
    ({ target }) => [
      h('p', { ref: target('summary'), 'data-name': 'summary' }, 'summary'),
      h('li', { ref: target('rows'), 'data-name': 'rows' }, 'row'),
    ],
  )
  open.value = true
  const seen = await firstShown(
    {
      summary: () => document.querySelector('[data-name="summary"]'),
      rows: () => document.querySelector('[data-name="rows"]'),
    },
    900,
  )
  const gap = seen.rows! - seen.summary!
  // Half of 400ms: well after the start, well before the arrival.
  expect(gap).toBeGreaterThanOrEqual(130)
  expect(gap).toBeLessThan(330)
})

test('a value with its own timing animates on that timing', async () => {
  const { open } = dialog({
    initial: { panel: { opacity: 0, y: { value: 24, duration: 600, easing: 'linear' } } },
  })
  open.value = true
  await nextTick()
  await frame()
  const t0 = performance.now()
  while (performance.now() - t0 < 300) await frame()
  // Halfway through its own 600ms: about halfway down. Opacity, on the shared timing, is done.
  expect(offset(panel()!).y).toBeGreaterThan(6)
  expect(offset(panel()!).y).toBeLessThan(18)
  expect(visible(panel()!)).toBeGreaterThan(0.95)
})

test('a hook that starts a frame late never shows the finished look first', async () => {
  // Like motion's animate(): nothing happens until the next frame.
  const { open, events } = dialog({
    initial: { panel: { opacity: 0 } },
    enter: ({ panel }) =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          panel.animate([{ opacity: 0 }, { opacity: 1 }], 120).finished.then(() => resolve()),
        ),
      ),
  })
  open.value = true
  await nextTick()
  // The first painted frame: still at `initial`.
  await new Promise(requestAnimationFrame)
  expect(Number(getComputedStyle(panel()!).opacity)).toBeLessThan(0.2)
  await vi.waitFor(() => expect(events).toContain('after-enter'))
  // The hold let go: the hook's end state shows.
  await new Promise(requestAnimationFrame)
  expect(Number(getComputedStyle(panel()!).opacity)).toBe(1)
})

test("exitOrder 'reverse': targets leave last-first to their own exit, then the panel", async () => {
  const { open, events } = dialog(
    {
      exitOrder: 'reverse',
      targets: {
        a: { initial: { opacity: 0 }, exit: { opacity: 0, x: -20 } },
        b: { initial: { opacity: 0 }, exit: { opacity: 0 } },
      },
    },
    ({ target }) => [
      h('p', { ref: target('a'), 'data-name': 'a' }, 'a'),
      h('p', { ref: target('b'), 'data-name': 'b' }, 'b'),
    ],
  )
  open.value = true
  await vi.waitFor(() => expect(events).toContain('after-enter'))
  const a = () => document.querySelector('[data-name="a"]')
  const b = () => document.querySelector('[data-name="b"]')
  open.value = false
  // When each starts to fade, and how far `a` travels.
  const t0 = performance.now()
  const faded: Record<string, number> = {}
  let aMin = 0
  while (panel()) {
    for (const [name, el] of [
      ['a', a()],
      ['b', b()],
      ['panel', panel()],
    ] as const)
      if (el && faded[name] === undefined && Number(getComputedStyle(el).opacity) < 0.97)
        faded[name] = performance.now() - t0
    if (a()) aMin = Math.min(aMin, offset(a()!).x)
    await frame()
  }
  expect(faded.b!).toBeLessThan(faded.a!)
  expect(faded.a!).toBeLessThan(faded.panel!)
  // a leaves to its own exit, x -20.
  expect(aMin).toBeLessThan(-12)
})

for (const end of ['open', 'closed'] as const)
  test(`spam toggling lands cleanly ${end}`, { timeout: 15000 }, async () => {
    const { open } = dialog(
      {
        exit: { panel: { opacity: 0, y: 12 } },
        targets: {
          rows: { initial: { opacity: 0, x: -8 }, stagger: 0.04 },
          total: { initial: { opacity: 0, scale: '0.9' }, after: 'rows:50%' },
        },
      },
      ({ target }) => [
        ...['a', 'b', 'c'].map((r) => h('li', { ref: target('rows'), key: r, 'data-row': '' }, r)),
        h('strong', { ref: target('total'), 'data-total': '' }, 'total'),
      ],
    )
    // Uneven gaps: inside one frame, mid-animation, and just after arrival.
    const gaps = [
      0, 5, 16, 40, 0, 90, 8, 160, 30, 0, 250, 12, 60, 0, 120, 20, 45, 0, 200, 10, 70, 0, 35, 140,
    ]
    for (const gap of gaps) {
      open.value = !open.value
      await new Promise((resolve) => setTimeout(resolve, gap))
    }
    open.value = end === 'open'
    await new Promise((resolve) => setTimeout(resolve, 1500))
    if (end === 'closed') {
      expect(panel()).toBeNull()
      return
    }
    const p = panel()!
    expect(Number(getComputedStyle(p).opacity)).toBe(1)
    expect(getComputedStyle(p).translate).toBe('none')
    for (const el of document.querySelectorAll('[data-row], [data-total]')) {
      expect(Number(getComputedStyle(el).opacity)).toBe(1)
      expect(getComputedStyle(el).scale).toBe('none')
    }
    // Nothing of ours is left running or holding.
    expect(
      document.getAnimations().filter((a) => a.id === 'ui-presence' && a.playState === 'running'),
    ).toHaveLength(0)
  })

test('static motion is played by CSS transitions; hooks and keyframe arrays by the runtime', async () => {
  const cssKinds = async (motion: DialogMotion) => {
    document.body.innerHTML = ''
    const { open } = dialog(motion)
    open.value = true
    await nextTick()
    // Wait for the first frame something animates, whichever engine it is.
    for (let i = 0; i < 30 && !panel()?.getAnimations().length; i++) await frame()
    const anims = panel()!.getAnimations()
    return {
      css: anims.some((a) => 'transitionProperty' in a),
      runtime: anims.some((a) => a.id === 'ui-presence'),
    }
  }
  expect(await cssKinds({ initial: { panel: { opacity: 0, y: 20 } } })).toEqual({
    css: true,
    runtime: false,
  })
  expect(
    await cssKinds({
      enter: ({ panel: el }) =>
        el.animate([{ opacity: 0 }, {}], { duration: 200, id: 'ui-presence' }),
    }),
  ).toEqual({ css: false, runtime: true })
  // A shake is keyframes: the CSS engine hands it to the runtime.
  expect(await cssKinds({ initial: { panel: { opacity: 0, x: [0, -8, 8, 0] } } })).toEqual({
    css: false,
    runtime: true,
  })
})

test('the built-in look keeps its own timing; your values ride the spring; { spring } retimes all', async () => {
  // The panel's moving transition, once the CSS engine has started it.
  const panelMove = async (motion: DialogMotion | undefined) => {
    document.body.innerHTML = ''
    const { open } = dialog(motion)
    open.value = true
    await nextTick()
    let move: CSSTransition | undefined
    for (let i = 0; i < 40 && !move; i++) {
      await frame()
      move = panel()
        ?.getAnimations()
        .find((a): a is CSSTransition =>
          ['scale', 'translate'].includes((a as CSSTransition).transitionProperty),
        )
    }
    const timing = move!.effect!.getTiming()
    return {
      duration: Math.round(Number(timing.duration)),
      spring: String(timing.easing).startsWith('linear('),
    }
  }
  // Untouched: Dialog's tokens, 200ms on the strong ease-out.
  expect(await panelMove(undefined)).toEqual({ duration: 200, spring: false })
  // Your values without a timing: the spring.
  expect((await panelMove({ initial: { panel: { opacity: 0, y: 20 } } })).spring).toBe(true)
  // { spring }: the built-in look, on your spring.
  expect((await panelMove({ spring: { damping: 0.8, response: 0.3 } })).spring).toBe(true)
})

test("a hook that writes the backdrop's opacity is never fought by a CSS transition", async () => {
  let fought: boolean | undefined
  const { open, events } = dialog({
    enter: ({ overlay }) => {
      // Like GSAP's from(): read where it is, write where it starts, and see if CSS takes over.
      void getComputedStyle(overlay).opacity
      overlay.style.opacity = '0'
      fought = overlay.getAnimations().some((a) => 'transitionProperty' in a)
      return overlay.animate([{ opacity: 0 }, { opacity: 1 }], 120)
    },
  })
  open.value = true
  await vi.waitFor(() => expect(events).toContain('after-enter'))
  expect(fought).toBe(false)
})

test('the title, body and other inner parts take initial values too, and stay put when not given', async () => {
  const title = () => document.querySelector<HTMLElement>('.ui-dialog-title')
  const body = () => document.querySelector<HTMLElement>('.ui-dialog-body')
  const { open, events } = dialog({ initial: { title: { opacity: 0, y: 16 } } })
  open.value = true
  await nextTick()
  await frame()
  // The title comes in from below; the body, not given values, moves only with the panel.
  expect(offset(title()!).y).toBeGreaterThan(8)
  expect(offset(body()!).y).toBe(0)
  await vi.waitFor(() => expect(events).toContain('after-enter'), { timeout: 3000 })
  expect(offset(title()!).y).toBe(0)
  // Closing: the body, never animated, gets no fade of its own.
  open.value = false
  await frame()
  await frame()
  expect(Number(getComputedStyle(body()!).opacity)).toBe(1)
  await vi.waitFor(() => expect(events).toContain('after-leave'))
})

test('steps: a target stops at each step, holds, then goes on to rest', async () => {
  const note = () => document.querySelector<HTMLElement>('.step-note')
  const { open, events } = dialog(
    {
      targets: {
        note: {
          initial: { opacity: 0 },
          steps: [
            { to: { opacity: 0.5 }, duration: 80 },
            { delay: 0.35, duration: 80 },
          ],
        },
      },
    },
    () => withDirectives(h('p', { class: 'step-note' }, 'Saved'), [[vAnimate, undefined, 'note']]),
  )
  open.value = true
  // Partway: it has reached the first step and holds there.
  await new Promise((r) => setTimeout(r, 250))
  expect(Number(getComputedStyle(note()!).opacity)).toBeCloseTo(0.5, 1)
  // Then it goes on to its resting look.
  await vi.waitFor(() => expect(Number(getComputedStyle(note()!).opacity)).toBe(1), {
    timeout: 2000,
  })
  await vi.waitFor(() => expect(events).toContain('after-enter'))
})

test('content without an exit of its own goes with the panel, not before it', async () => {
  const { open, events } = dialog(
    { targets: { rows: { initial: { opacity: 0 } } } },
    ({ target }) => [h('li', { ref: target('rows'), 'data-name': 'row' }, 'row')],
  )
  open.value = true
  await vi.waitFor(() => expect(events).toContain('after-enter'))
  const row = () => document.querySelector<HTMLElement>('[data-name="row"]')
  open.value = false
  let lowest = 1
  while (panel() && row()) {
    lowest = Math.min(lowest, Number(getComputedStyle(row()!).opacity))
    await frame()
  }
  // Its own opacity holds: it fades only as the panel around it does.
  expect(lowest).toBe(1)
})

test("appear: 'later' inside a panel: not with its opening, yes for a row that comes while it's open", async () => {
  const rows = shallowRef(['a', 'b'])
  const later = { appear: 'later' as const, initial: { opacity: 0 }, duration: 400 }
  const { open, events } = dialog(undefined, () =>
    rows.value.map((r) =>
      withDirectives(h('p', { key: r, 'data-row': r }, r), [[vAnimate, later]]),
    ),
  )
  const row = (r: string) => document.querySelector<HTMLElement>(`[data-row="${r}"]`)
  open.value = true
  let lowest = 1
  while (!events.includes('after-enter')) {
    if (row('a')) lowest = Math.min(lowest, Number(getComputedStyle(row('a')!).opacity))
    await frame()
  }
  // The opening brings the panel in; its rows show as they are.
  expect(lowest).toBe(1)
  rows.value = ['a', 'b', 'c']
  await vi.waitFor(() => expect(row('c')).not.toBeNull())
  await frame()
  await frame()
  expect(Number(getComputedStyle(row('c')!).opacity)).toBeLessThan(1)
})
