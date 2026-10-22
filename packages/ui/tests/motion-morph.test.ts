import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
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
  "morph: 'trigger' grows from the trigger's box, hides it while open, shrinks back, and gets focus back",
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
    while (panel()) {
      last = visibleBox(panel()!)
      widths.add(Math.round(last.width))
      await frame()
    }
    // It shrinks through sizes on the way, not in one jump.
    expect(widths.size).toBeGreaterThan(5)
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
