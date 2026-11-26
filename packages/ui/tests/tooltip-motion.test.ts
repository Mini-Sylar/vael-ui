// Tooltip on the motion system: the built-in CSS look unless the motion is yours.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import Tooltip from '../src/components/Tooltip/Tooltip.vue'
import { __resetTooltipWarmth } from '../src/composables/useTooltip'

const global = { stubs: { transition: false } }
const panel = () => document.querySelector<HTMLElement>('.ui-tooltip-panel')
const positioner = () => document.querySelector<HTMLElement>('.ui-tooltip-positioner')

function renderTip(motion: unknown) {
  const open = shallowRef(false)
  const trigger = document.createElement('button')
  document.body.append(trigger)
  render(
    () =>
      h(
        Tooltip as never,
        {
          triggerEl: trigger,
          motion,
          open: open.value,
          'onUpdate:open': (v: boolean) => (open.value = v),
        },
        () => 'Tip',
      ),
    { global },
  )
  return open
}

test('built in: the CSS look, unchanged', async () => {
  const open = renderTip(undefined)
  open.value = true
  await vi.waitFor(() =>
    expect(positioner()?.classList.contains('ui-tooltip-enter-active')).toBe(true),
  )
})

test('your hooks get the panel, and it waits for your leave', async () => {
  const left: HTMLElement[] = []
  const open = renderTip({
    leave: ({ panel }: { panel: HTMLElement }) => {
      left.push(panel)
      return panel.animate([{ opacity: 1 }, { opacity: 0 }], 300)
    },
  })
  open.value = true
  await vi.waitFor(() => expect(panel()).not.toBeNull())
  const shown = panel()!
  expect(positioner()!.classList.contains('ui-tooltip-enter-active')).toBe(false)
  open.value = false
  await vi.waitFor(() => expect(left).toEqual([shown]))
  expect(shown.isConnected).toBe(true)
  await vi.waitFor(() => expect(shown.isConnected).toBe(false), { timeout: 1000 })
})

test('your values play on the motion system', async () => {
  const open = renderTip({ initial: { panel: { opacity: 0, y: 4 } } })
  open.value = true
  await vi.waitFor(() => expect(panel()?.getAnimations().length).toBeGreaterThan(0))
})

test('`false` shows and hides it at once', async () => {
  const open = renderTip(false)
  open.value = true
  await nextTick()
  await vi.waitFor(() => expect(panel()).not.toBeNull())
  expect(positioner()!.classList.contains('ui-tooltip-enter-active')).toBe(false)
  open.value = false
  await nextTick()
  await nextTick()
  expect(panel()).toBeNull()
})

test('closed before it was placed, your leave still gets the panel', async () => {
  const left: unknown[] = []
  const open = renderTip({
    leave: ({ panel }: { panel: HTMLElement }) => {
      left.push(panel)
    },
  })
  open.value = true
  await nextTick()
  const shown = panel()
  expect(shown).not.toBeNull()
  // Its position isn't measured yet, so its enter hasn't run.
  expect(positioner()!.style.visibility).toBe('hidden')
  open.value = false
  await vi.waitFor(() => expect(left).toEqual([shown]))
})

test('your motion: hovered again mid-exit, it turns back from where it is', async () => {
  const { userEvent } = await import('vitest/browser')
  __resetTooltipWarmth()
  const trigger = document.createElement('button')
  trigger.textContent = 'T'
  trigger.style.margin = '80px'
  document.body.append(trigger)
  const linear = (value: number) => ({ value, duration: 400, easing: 'linear' })
  render(
    () =>
      h(
        Tooltip as never,
        {
          triggerEl: trigger,
          openDelay: 0,
          closeDelay: 0,
          motion: { duration: 400, easing: 'linear', exit: { panel: { opacity: linear(0) } } },
        },
        { default: () => 'Tip' },
      ),
    { global },
  )
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
  const opacity = () => {
    let value = panel() ? 1 : 0
    for (let el = panel(); el; el = el.parentElement) value *= Number(getComputedStyle(el).opacity)
    return value
  }
  await userEvent.hover(trigger)
  await vi.waitFor(() => expect(opacity()).toBe(1))
  await userEvent.hover(document.body, { position: { x: 1, y: 1 } })
  await vi.waitFor(() => expect(opacity()).toBeLessThan(0.8))
  // Every frame from just before the second hover: no frame jumps.
  const seen: number[] = []
  let recording = true
  const record = () => {
    seen.push(opacity())
    if (recording) requestAnimationFrame(record)
  }
  record()
  await userEvent.hover(trigger)
  for (let i = 0; i < 10; i++) await frame()
  recording = false
  const jumps = seen.slice(1).map((value, i) => Math.abs(value - seen[i]!))
  expect(Math.max(...jumps)).toBeLessThan(0.2)
  await vi.waitFor(() => expect(opacity()).toBe(1))
  trigger.remove()
})
