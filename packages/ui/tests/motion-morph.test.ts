import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { h, nextTick, shallowRef } from 'vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import type { DialogMotion } from '../src/motion/types'

const real = { global: { stubs: { transition: false } } }
const frame = () => new Promise(requestAnimationFrame)
const panel = () => document.querySelector<HTMLElement>('.ui-dialog-panel')
const trigger = () => document.querySelector<HTMLElement>('[data-testid="trigger"]')!

afterEach(() => {
  document.body.innerHTML = ''
})

/** What you see of the panel: its box, moved by its translate, shrunk by its clip. */
function visibleBox(el: HTMLElement) {
  const box = el.getBoundingClientRect()
  const clip = getComputedStyle(el).clipPath
  const insets = clip.startsWith('inset(')
    ? clip
        .slice(6)
        .split('round')[0]!
        .trim()
        .split(/\s+/)
        .map((v) => Number.parseFloat(v))
    : [0]
  const [top = 0, right = top, bottom = top, left = right] = insets
  return {
    left: box.left + Math.max(0, left),
    top: box.top + Math.max(0, top),
    width: box.width - Math.max(0, left) - Math.max(0, right),
    height: box.height - Math.max(0, top) - Math.max(0, bottom),
  }
}

function setup(motion: DialogMotion = { morph: 'trigger' }) {
  const open = shallowRef(false)
  render(
    {
      setup: () => () => [
        h(
          'button',
          {
            'data-testid': 'trigger',
            style: 'position: fixed; left: 40px; top: 40px; width: 120px; height: 48px',
            onClick: () => (open.value = true),
          },
          'Open',
        ),
        h(Dialog as never, {
          open: open.value,
          'onUpdate:open': (v: boolean) => (open.value = v),
          title: 'Morph',
          motion,
        }),
      ],
    },
    real,
  )
  return open
}

test(
  "morph: 'trigger' grows out of the trigger itself, hides it while open, shrinks back, and gets focus back",
  { timeout: 8000 },
  async () => {
    const open = setup()
    trigger().focus()
    trigger().click()
    await nextTick()
    // The first frame something shows: sitting on the trigger.
    while (!panel() || !panel()!.hasAttribute('data-ui-m')) await frame()
    const t = trigger().getBoundingClientRect()
    const first = visibleBox(panel()!)
    expect(Math.abs(first.left - t.left)).toBeLessThan(12)
    expect(Math.abs(first.top - t.top)).toBeLessThan(12)
    expect(Math.abs(first.width - t.width)).toBeLessThan(20)
    // It is the button from the first frame: the panel opaque in its place, the button gone.
    expect(Number(getComputedStyle(panel()!).opacity)).toBe(1)
    expect(getComputedStyle(trigger()).opacity).toBe('0')
    // Settled: the panel's own box, no clip left.
    await vi.waitFor(() => expect(panel()!.hasAttribute('data-ui-m')).toBe(false), {
      timeout: 3000,
    })
    expect(getComputedStyle(panel()!).clipPath).toBe('none')
    expect(getComputedStyle(panel()!).translate).toBe('none')
    // Close: back onto the trigger, which shows again once it's there.
    open.value = false
    await nextTick()
    let last = visibleBox(panel()!)
    const widths = new Set<number>()
    let shownBeforeGone = false
    while (panel()) {
      last = visibleBox(panel()!)
      widths.add(Math.round(last.width))
      shownBeforeGone = getComputedStyle(trigger()).opacity === '1'
      await frame()
    }
    // It shrinks through sizes on the way, not in one jump.
    expect(widths.size).toBeGreaterThan(5)
    // The trigger was back under it before it went, and it had faded off it: no blank frame.
    expect(shownBeforeGone).toBe(true)
    expect(Math.abs(last.left - t.left)).toBeLessThan(16)
    expect(Math.abs(last.width - t.width)).toBeLessThan(24)
    expect(getComputedStyle(trigger()).opacity).toBe('1')
    // Hidden by opacity, not visibility, so focus could return to it.
    expect(document.activeElement).toBe(trigger())
  },
)

test(
  'closing mid-morph turns back without a jump, and the trigger comes back',
  { timeout: 8000 },
  async () => {
    const open = setup()
    trigger().focus()
    trigger().click()
    await nextTick()
    while (!panel() || !panel()!.hasAttribute('data-ui-m')) await frame()
    for (let i = 0; i < 6; i++) await frame()
    open.value = false
    await nextTick()
    // Every frame of the turn: no leap in where the panel is.
    const boxes: { left: number; width: number }[] = []
    while (panel()) {
      boxes.push(visibleBox(panel()!))
      await frame()
    }
    for (let i = 1; i < boxes.length; i++) {
      expect(Math.abs(boxes[i]!.left - boxes[i - 1]!.left)).toBeLessThan(60)
      expect(Math.abs(boxes[i]!.width - boxes[i - 1]!.width)).toBeLessThan(90)
    }
    expect(getComputedStyle(trigger()).opacity).toBe('1')
  },
)

test(
  'hide: false keeps the trigger on screen while the panel still grows out of it',
  { timeout: 8000 },
  async () => {
    const open = setup({ morph: { from: 'trigger', hide: false } })
    trigger().focus()
    trigger().click()
    await nextTick()
    while (!panel() || !panel()!.hasAttribute('data-ui-m')) await frame()
    // It still grows out of the trigger (the starting box itself is pinned by the first test).
    const first = visibleBox(panel()!).width
    const seen = new Set<string>()
    while (panel()?.hasAttribute('data-ui-m')) {
      seen.add(getComputedStyle(trigger()).opacity)
      await frame()
    }
    expect(visibleBox(panel()!).width).toBeGreaterThan(first + 100)
    open.value = false
    await nextTick()
    while (panel()) {
      seen.add(getComputedStyle(trigger()).opacity)
      await frame()
    }
    expect([...seen]).toEqual(['1'])
    expect(document.activeElement).toBe(trigger())
  },
)

function setupWith(motion: DialogMotion, label = false, tag = 'button') {
  const open = shallowRef(false)
  render(
    {
      setup: () => () => [
        h(
          tag,
          {
            'data-testid': 'trigger',
            role: tag === 'button' ? undefined : 'button',
            style:
              'position: fixed; left: 40px; top: 40px; width: 120px; height: 48px; background: rgb(255, 0, 0); border: 0',
            onClick: () => (open.value = true),
          },
          label
            ? [
                h(
                  'span',
                  { class: 'from', 'data-layout-id': 'lbl', style: 'display: inline-block' },
                  'Open',
                ),
              ]
            : 'Open',
        ),
        h(
          Dialog as never,
          {
            open: open.value,
            'onUpdate:open': (v: boolean) => (open.value = v),
            title: 'Morph',
            motion,
          },
          () =>
            label
              ? h(
                  'span',
                  { class: 'to', 'data-layout-id': 'lbl', style: 'display: inline-block' },
                  'Open',
                )
              : 'Body',
        ),
      ],
    },
    real,
  )
  return open
}
// The first frame the morph shows: clipped onto the trigger.
const firstFrame = async () => {
  await nextTick()
  for (let i = 0; i < 30; i++) {
    const p = panel()
    if (p && /^inset\(\d/.test(getComputedStyle(p).clipPath)) return
    await frame()
  }
}

test('a click that leaves focus where it was (Safari) still morphs out of the button', async () => {
  // A real click on something that can't take focus: focus stays on <body>, as in Safari.
  setupWith({ morph: 'trigger' }, false, 'div')
  expect(document.activeElement).toBe(document.body)
  await userEvent.click(trigger())
  await firstFrame()
  // Morphing: clipped to the button's size near it (not opening centred, unclipped).
  expect(getComputedStyle(panel()!).clipPath).toMatch(/^inset\(\d/)
  const t = trigger().getBoundingClientRect()
  const first = visibleBox(panel()!)
  expect(Math.abs(first.left - t.left)).toBeLessThan(30)
  expect(Math.abs(first.width - t.width)).toBeLessThan(40)
})

test("the panel starts in the button's colour, so the button becomes it", async () => {
  setupWith({ morph: 'trigger' })
  trigger().focus()
  trigger().click()
  await firstFrame()
  const [r, g, b] = getComputedStyle(panel()!).backgroundColor.match(/\d+/g)!.map(Number)
  // Still red, on its way to the panel's own surface.
  expect(r).toBeGreaterThan(200)
  expect(g! + b!).toBeLessThan(200)
})

test('with the trigger staying, the panel fades into it as it lands instead of covering it', async () => {
  const open = setupWith({ morph: { from: 'trigger', hide: false } })
  trigger().focus()
  trigger().click()
  await vi.waitFor(() => expect(panel()?.hasAttribute('data-ui-m')).toBe(false), { timeout: 3000 })
  open.value = false
  await nextTick()
  let last = 1
  while (panel()) {
    last = Number(getComputedStyle(panel()!).opacity)
    await frame()
  }
  expect(last).toBeLessThan(0.15)
  expect(getComputedStyle(trigger()).opacity).toBe('1')
})

test("an element under the same layoutId in the button and the panel starts on the button's", async () => {
  setupWith({ morph: 'trigger' }, true)
  trigger().focus()
  trigger().click()
  // Its own first frame: carried (another test's panel may still be leaving).
  for (let i = 0; i < 60; i++) {
    const to = document.querySelector('.to')
    if (to && getComputedStyle(to).translate !== 'none') break
    await frame()
  }
  // Where it starts, whatever frame this is: its resting box, plus where the panel's and its own
  // translate start (each transition's first keyframe).
  const xy = (v: unknown) =>
    String(v ?? '0px 0px')
      .split(' ')
      .map((n) => Number.parseFloat(n) || 0)
  const moving = (el: Element) => {
    const run = el
      .getAnimations()
      .find((a) => (a as CSSTransition).transitionProperty === 'translate')
    const start = xy((run?.effect as KeyframeEffect | undefined)?.getKeyframes()[0]?.translate)
    return {
      start,
      now: xy(getComputedStyle(el).translate === 'none' ? '' : getComputedStyle(el).translate),
    }
  }
  const label = document.querySelector('.to')!
  const p = moving(label.closest('.ui-dialog-panel')!)
  const l = moving(label)
  const box = label.getBoundingClientRect()
  const from = document.querySelector('.from')!.getBoundingClientRect()
  const startLeft = box.left - p.now[0]! - l.now[0]! + p.start[0]! + l.start[0]!
  const startTop = box.top - p.now[1]! - l.now[1]! + p.start[1]! + l.start[1]!
  expect(Math.abs(startLeft - from.left)).toBeLessThan(3)
  expect(Math.abs(startTop - from.top)).toBeLessThan(3)
  // Seen the whole way: the content fade passes over it.
  expect(Number(getComputedStyle(document.querySelector('.to')!).opacity)).toBe(1)
})

test("exitOrder: 'reverse' beside a morph still morphs out of the button", async () => {
  setup({ morph: 'trigger', exitOrder: 'reverse' })
  trigger().focus()
  trigger().click()
  await nextTick()
  while (!panel() || !panel()!.hasAttribute('data-ui-m')) await frame()
  const t = trigger().getBoundingClientRect()
  const first = visibleBox(panel()!)
  // Near the button's box, not the panel's: without the morph it opens at full width.
  expect(Math.abs(first.left - t.left)).toBeLessThan(24)
  expect(first.width).toBeLessThan(t.width * 1.5)
})

test("a pill trigger's 9999px corner is drawn as half its height: the panel's clip starts there", async () => {
  const open = shallowRef(false)
  render(
    {
      setup: () => () => [
        h(
          'button',
          {
            'data-testid': 'trigger',
            style:
              'position: fixed; left: 40px; top: 40px; width: 120px; height: 48px; border-radius: 9999px',
            onClick: () => (open.value = true),
          },
          'Open',
        ),
        h(Dialog as never, { open: open.value, title: 'Pill', motion: { morph: 'trigger' } }),
      ],
    },
    real,
  )
  trigger().focus()
  trigger().click()
  await nextTick()
  while (!panel() || !panel()!.hasAttribute('data-ui-m')) await frame()
  const corner = Number.parseFloat(getComputedStyle(panel()!).clipPath.split('round')[1] ?? '0')
  expect(corner).toBeGreaterThan(10)
  expect(corner).toBeLessThan(60)
})
