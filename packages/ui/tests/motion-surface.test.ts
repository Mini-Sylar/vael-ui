import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import Button from '../src/components/Button/Button.vue'
import Popover from '../src/components/Popover/Popover.vue'

const real = { global: { stubs: { transition: false } } }
const frame = () => new Promise(requestAnimationFrame)
const layer = () => document.querySelector<HTMLElement>('.ui-popover-surface')
const shapes = () => [...document.querySelectorAll<HTMLElement>('.ui-popover-surface-shape')]
const panel = () => document.querySelector<HTMLElement>('.ui-popover-panel')!
const trigger = () => document.querySelector<HTMLElement>('.goo-trigger')!

afterEach(() => {
  document.body.innerHTML = ''
})

function gooey(open = shallowRef(false)) {
  render(
    {
      setup: () => () =>
        h('div', { style: 'padding: 4rem' }, [
          h(
            Popover as never,
            {
              open: open.value,
              'onUpdate:open': (v: boolean) => (open.value = v),
              openOnTriggerClick: true,
              side: 'right',
              motion: { morph: { from: 'trigger', hide: false }, surface: { filter: 'blur(1px)' } },
            },
            {
              trigger: () =>
                h(Button as never, { class: 'goo-trigger', pill: true }, () => 'Gooey'),
              default: () => h('p', 'Panel'),
            },
          ),
        ]),
    },
    real,
  )
  return open
}

// First in the file: the morph kit's first load is when a panel is already placed as it asks.
test('the morph starts on the trigger, measured where the panel was placed', async () => {
  const open = gooey()
  await frame()
  open.value = true
  await vi.waitFor(() => expect(panel().getAnimations().length).toBeGreaterThan(0))
  // Where it starts: its layout box moved by the transition's first keyframe.
  const move = panel()
    .getAnimations()
    .find((a) => (a as CSSTransition).transitionProperty === 'translate')!
  const [x = '0', y = '0'] = String(
    (move.effect as KeyframeEffect).getKeyframes()[0]!.translate,
  ).split(' ')
  const now = getComputedStyle(panel()).translate.split(' ')
  const p = panel().getBoundingClientRect()
  const t = trigger().getBoundingClientRect()
  const left = p.left - (Number.parseFloat(now[0]!) || 0) + Number.parseFloat(x)
  const top = p.top - (Number.parseFloat(now[1] ?? '0') || 0) + Number.parseFloat(y)
  expect(left + p.width / 2).toBeCloseTo(t.left + t.width / 2, -1)
  expect(top + p.height / 2).toBeCloseTo(t.top + t.height / 2, -1)
})

test('the surface is there only while open: a pill on the trigger, a blob under the panel', async () => {
  const open = gooey()
  await frame()
  expect(layer()).toBeNull()
  open.value = true
  await vi.waitFor(() => expect(shapes()).toHaveLength(2))
  // Your values go on the layer, never on the panel.
  expect(layer()!.style.filter).toBe('blur(1px)')
  expect(getComputedStyle(panel()).filter).toBe('none')
  await vi.waitFor(() => expect(panel().getAnimations()).toHaveLength(0), { timeout: 2000 })
  const [pill, blob] = shapes()
  const box = (el: Element) => el.getBoundingClientRect()
  // The pill sits just inside the trigger, so its own halo never rims it.
  const t0 = box(trigger())
  const p0 = box(pill!)
  expect(p0.left - t0.left).toBeCloseTo(0, 0)
  expect(t0.bottom - p0.bottom).toBeCloseTo(0, 0)
  for (const key of ['left', 'top', 'width', 'height'] as const)
    expect(box(blob!)[key]).toBeCloseTo(box(panel())[key], 0)
  // Above the page, behind the panel: in the panel's own layer, under it.
  expect(layer()!.parentElement!.classList.contains('ui-popover-positioner')).toBe(true)
  expect(getComputedStyle(layer()!).zIndex).toBe('-1')
  // The trigger is cut out of it, so the real one shows through.
  expect(layer()!.style.clipPath).toMatch(/^path\(evenodd/)

  open.value = false
  await vi.waitFor(() => expect(layer()).toBeNull(), { timeout: 2000 })
})

test("the blob carries the panel's colour; the panel goes clear while open and gets it back after", async () => {
  const open = gooey()
  await frame()
  const own = getComputedStyle(panel() ?? document.body).backgroundColor
  open.value = true
  await vi.waitFor(() => expect(shapes()).toHaveLength(2))
  // Clear while open (read as computed: WebKit writes the shorthand back as 'none').
  await vi.waitFor(() => expect(getComputedStyle(panel()).backgroundColor).toBe('rgba(0, 0, 0, 0)'))
  const colour = shapes()[1]!.style.background
  expect(colour).not.toBe('')
  expect(colour).not.toBe('transparent')
  // One colour for both: they melt into one shape.
  expect(shapes()[0]!.style.background).toBe(colour)
  open.value = false
  await vi.waitFor(() => expect(panel()?.style.background ?? '').toBe(''), { timeout: 2000 })
  expect(own).toBeDefined()
})

test('the blob moves exactly as the panel does, and the morph starts on the trigger where it was placed', async () => {
  const open = gooey()
  await frame()
  open.value = true
  // On screen, frame by frame: the blob where the panel is, clipped as it is.
  await vi.waitFor(() => expect(panel().getAnimations().length).toBeGreaterThan(0))
  const blob = shapes()[1]!
  // Each moving property's keyframes and clock: the same on both is the same motion, painted
  // together. (Computed values read one after the other can sample a moment apart in WebKit.)
  const look = (el: Element) =>
    el
      .getAnimations()
      .map((a) => {
        const k = (a.effect as KeyframeEffect).getKeyframes()
        return `${(a as CSSTransition).transitionProperty}@${a.startTime} ${k.map((f) => `${f.translate ?? ''}/${f.clipPath ?? ''}`).join('>')}`
      })
      .sort()
      .join(' | ')
  for (let i = 0; i < 6; i++) {
    expect(look(blob)).toBe(look(panel()))
    await frame()
  }
  // Closed mid-open: both carry on from where they are, not from rest.
  open.value = false
  // The close's own transition: the one heading back to the trigger, not to rest.
  const from = (el: Element) =>
    el
      .getAnimations()
      .map((a) => (a.effect as KeyframeEffect).getKeyframes())
      .find((k) => k[0]?.translate !== undefined && k[1]?.translate !== 'none')?.[0]?.translate
  await vi.waitFor(() => expect(from(panel())).toBeDefined())
  expect(from(panel())).not.toBe('none')
  expect(from(blob)).toBe(from(panel()))
  for (let i = 0; i < 4; i++) {
    expect(look(blob)).toBe(look(panel()))
    await frame()
  }
})
