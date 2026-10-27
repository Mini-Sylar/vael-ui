import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { nextTick } from 'vue'
import type { CalendarMotion } from '../src/motion/types'
import Calendar from '../src/components/Calendar/Calendar.vue'

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const settle = () => new Promise((resolve) => setTimeout(resolve, 350))

// The leaving grid goes absolute for the slide. In the month and year views it stretched with the
// level before that and packed its rows at the top after, so old and new rows crossed at different
// heights.
test.each(['month', 'year'] as const)(
  "in the %s view, the leaving grid keeps the entering grid's height while the view slides",
  async (level) => {
    const screen = await render(Calendar, {
      props: { modelValue: new Date(2026, 9, 20) },
      global: { stubs: { transition: false } },
    })
    const label = () => screen.container.querySelector<HTMLElement>('.ui-calendar-label--button')!
    label().click()
    await settle()
    if (level === 'year') {
      label().click()
      await settle()
    }
    screen.container.querySelector<HTMLElement>('[aria-label*="next" i]')!.click()
    await nextTick()
    await frame()
    await frame()
    const grids = [...screen.container.querySelectorAll<HTMLElement>('[role="grid"]')]
    expect(grids).toHaveLength(2)
    const [leaving, entering] = grids
    expect(leaving.className).toContain('leave-active')
    expect(leaving.getBoundingClientRect().height).toBeCloseTo(
      entering.getBoundingClientRect().height,
      0,
    )
    expect(leaving.getBoundingClientRect().top).toBeCloseTo(entering.getBoundingClientRect().top, 0)
  },
)

test('the header label eases to its new width when the level changes', async () => {
  const screen = await render(Calendar, {
    props: { modelValue: new Date(2026, 9, 20) },
    global: { stubs: { transition: false } },
  })
  const button = () => screen.container.querySelector<HTMLElement>('.ui-calendar-label--button')!
  const before = button().getBoundingClientRect().width
  // The transition's own events, so a busy machine can't miss the ease; one frame in, the width
  // is partway and the arriving name sits at the button's middle, not its start edge.
  let eased = false
  let partway = 0
  let offCentre = 0
  button().addEventListener('transitionstart', (event) => {
    if (event.propertyName !== 'inline-size' && event.propertyName !== 'width') return
    eased = true
    requestAnimationFrame(() => {
      const box = button().getBoundingClientRect()
      partway = box.width
      const entering = screen.container.querySelector<HTMLElement>(
        '.ui-calendar-label-text.ui-calendar-label-enter-active',
      )
      if (entering) {
        const text = entering.getBoundingClientRect()
        offCentre = Math.abs(text.left + text.width / 2 - (box.left + box.width / 2))
      }
    })
  })
  button().click()
  await settle()
  const after = button().getBoundingClientRect().width
  expect(after).not.toBeCloseTo(before, 0)
  expect(eased).toBe(true)
  expect(partway).toBeGreaterThanOrEqual(Math.min(before, after) - 1)
  expect(partway).toBeLessThanOrEqual(Math.max(before, after) + 1)
  expect(offCentre).toBeLessThan(6)
  expect(button().style.inlineSize).toBe('')
})

test('a motion object: the engine plays the month change, each way the way you moved', async () => {
  const motion: CalendarMotion = {
    initial: { grid: ({ direction }) => ({ opacity: 0, x: 20 * direction }) },
    exit: { grid: ({ direction }) => ({ opacity: 0, x: -20 * direction }) },
    duration: 300,
  }
  const screen = await render(Calendar, {
    props: { modelValue: new Date(2026, 9, 20), motion },
    global: { stubs: { transition: false } },
  })
  const nav = (name: string) =>
    screen.container.querySelector<HTMLElement>(`[aria-label="${name}"]`)!
  const leavingTo = async () => {
    const height = screen.container.querySelector('[role="grid"]')!.getBoundingClientRect().height
    await vi.waitFor(() =>
      expect(screen.container.querySelectorAll('[role="grid"]')).toHaveLength(2),
    )
    const [leaving, entering] = screen.container.querySelectorAll<HTMLElement>('[role="grid"]')
    // Played by the engine, not the CSS classes; it keeps its place and size while it goes.
    expect(leaving!.className).not.toContain('leave-active')
    expect(leaving!.getBoundingClientRect().height).toBeCloseTo(height, 0)
    expect(leaving!.getBoundingClientRect().top).toBeCloseTo(
      entering!.getBoundingClientRect().top,
      0,
    )
    await vi.waitFor(() => expect(leaving!.getAnimations()).toHaveLength(1))
    const end = (leaving!.getAnimations()[0]!.effect as KeyframeEffect).getKeyframes().at(-1)!
    return String(end.translate)
  }
  nav('Next month').click()
  // The label goes first (one after the other), so it gets out of the way quickly.
  await vi.waitFor(() => {
    const label = screen.container.querySelector('.ui-calendar-label-text')!
    const run = label.getAnimations()[0]
    expect(Number(run?.effect?.getComputedTiming().duration)).toBeLessThanOrEqual(150)
  })
  expect(await leavingTo()).toMatch(/^-20px/)
  await vi.waitFor(() => expect(screen.container.querySelectorAll('[role="grid"]')).toHaveLength(1))
  nav('Previous month').click()
  expect(await leavingTo()).toMatch(/^20px/)
})

test("a motion object, in the month view: the leaving grid keeps the entering grid's height", async () => {
  const screen = await render(Calendar, {
    props: { modelValue: new Date(2026, 9, 20), motion: { duration: 300 } },
    global: { stubs: { transition: false } },
  })
  screen.container.querySelector<HTMLElement>('.ui-calendar-label--button')!.click()
  await settle()
  screen.container.querySelector<HTMLElement>('[aria-label*="next" i]')!.click()
  await vi.waitFor(() => expect(screen.container.querySelectorAll('[role="grid"]')).toHaveLength(2))
  await frame()
  const [leaving, entering] = screen.container.querySelectorAll<HTMLElement>('[role="grid"]')
  expect(leaving!.getBoundingClientRect().height).toBeCloseTo(
    entering!.getBoundingClientRect().height,
    0,
  )
})

test('with motion off, next month changes the month and its label without an error', async () => {
  const errors: unknown[] = []
  const screen = await render(Calendar, {
    props: { modelValue: new Date(2026, 9, 20), motion: false },
    global: { stubs: { transition: false }, config: { errorHandler: (e) => errors.push(e) } },
  })
  const label = () => screen.container.querySelector('.ui-calendar-label-text')?.textContent
  const before = label()
  screen.container.querySelector<HTMLElement>('[aria-label*="next" i]')!.click()
  await vi.waitFor(() => expect(label()).not.toBe(before))
  await frame()
  expect(errors).toEqual([])
})
