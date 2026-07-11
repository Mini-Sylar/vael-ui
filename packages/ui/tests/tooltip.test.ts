import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import TooltipFixture from './fixtures/TooltipFixture.vue'
import TooltipHostFixture from './fixtures/TooltipHostFixture.vue'
import { __resetTooltipWarmth } from '../src/composables/useTooltip'

beforeEach(() => {
  __resetTooltipWarmth()
  // Teleported positioners can outlive a fixture torn down mid-transition.
  for (const el of document.querySelectorAll('.ui-tooltip-positioner')) el.remove()
})

test('cold open waits for the delay; leave hides after the grace period', async () => {
  const screen = render(TooltipFixture)
  const trigger = screen.getByTestId('trigger-a')

  await trigger.hover()
  expect(document.querySelector('[data-testid="tip-a"]')).toBeNull()
  await expect.element(screen.getByTestId('tip-a')).toBeVisible()

  await vi.waitFor(() => {
    expect(trigger.element().getAttribute('aria-describedby')).toBeTruthy()
  })

  await screen.getByTestId('plain').hover()
  await vi.waitFor(() => {
    expect(document.querySelector('[data-testid="tip-a"]')).toBeNull()
  })
  expect(trigger.element().getAttribute('aria-describedby')).toBeNull()
})

test('warm group: the next tooltip opens instantly with data-instant', async () => {
  const screen = render(TooltipFixture)

  await screen.getByTestId('trigger-a').hover()
  await expect.element(screen.getByTestId('tip-a')).toBeVisible()

  await screen.getByTestId('trigger-b').hover()
  // No 120ms delay: visible within one poll tick
  await vi.waitFor(
    () => {
      expect(document.querySelector('[data-testid="tip-b"]')).not.toBeNull()
    },
    { timeout: 60 },
  )
  const positioner = document
    .querySelector('[data-testid="tip-b"]')!
    .closest<HTMLElement>('.ui-tooltip-positioner')!
  expect(positioner.dataset.instant).toBe('true')
})

test('keyboard focus shows immediately; Escape hides', async () => {
  const screen = render(TooltipFixture)
  // Listeners attach reactively post-mount — tabbing immediately can race them.
  await new Promise((r) => setTimeout(r, 50))

  // Focus can start anywhere depending on prior tests — tab until the trigger.
  const trigger = screen.getByTestId('trigger-a').element()
  for (let i = 0; i < 8 && document.activeElement !== trigger; i++) {
    await userEvent.keyboard('{Tab}')
  }
  expect(document.activeElement).toBe(trigger)
  await vi.waitFor(
    () => {
      expect(document.querySelector('[data-testid="tip-a"]')).not.toBeNull()
    },
    { timeout: 100 },
  )

  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => {
    expect(document.querySelector('[data-testid="tip-a"]')).toBeNull()
  })
})

test('slot trigger path: hover on a Button inside #trigger opens the tooltip', async () => {
  const screen = render(TooltipFixture)
  await screen.getByTestId('trigger-slot').hover()
  await expect.element(screen.getByTestId('tip-slot')).toBeVisible()
})

test('v-tooltip + TooltipHost: delegation shows string content and side modifier applies', async () => {
  const screen = render(TooltipHostFixture)

  await screen.getByTestId('host-a').hover()
  await vi.waitFor(() => {
    expect(document.querySelector('.ui-tooltip-panel')?.textContent).toContain(
      'Saved via directive',
    )
  })

  await screen.getByTestId('host-b').hover()
  await vi.waitFor(() => {
    expect(document.querySelector('.ui-tooltip-panel')?.textContent).toContain('Right side')
  })
  await vi.waitFor(() => {
    expect(document.querySelector<HTMLElement>('.ui-tooltip-positioner')?.dataset.side).toBe(
      'right',
    )
  })
})

test('v-tooltip="undefined" renders no tooltip, and toggling to a real value later starts one', async () => {
  const screen = render(TooltipHostFixture)
  const target = document.querySelector<HTMLElement>('[data-testid="host-conditional"]')!

  // No hint bound yet: no directive attribute, no hover-triggered panel.
  expect(target.hasAttribute('data-ui-tooltip')).toBe(false)
  await screen.getByTestId('host-conditional').hover()
  await new Promise((resolve) => setTimeout(resolve, 200))
  expect(document.querySelector('.ui-tooltip-panel')).toBeNull()

  await screen.getByTestId('toggle-conditional-hint').click()
  expect(target.hasAttribute('data-ui-tooltip')).toBe(true)
  await screen.getByTestId('host-conditional').hover()
  await vi.waitFor(() => {
    expect(document.querySelector('.ui-tooltip-panel')?.textContent).toContain('Now has a hint')
  })

  // Toggling back off tears the target down again, not just hides content.
  await screen.getByTestId('toggle-conditional-hint').click()
  expect(target.hasAttribute('data-ui-tooltip')).toBe(false)
})

test('v-tooltip on a Button anchors to the real button, not a badge wrapper', async () => {
  const screen = render(TooltipHostFixture)

  // A badge-less Button has no `.ui-button-badge-wrapper` at all (see
  // Button.vue's own comment — an unconditional wrapper broke Vue's
  // "parent scoped styles reach the child root" mechanism), so the
  // directive's target IS the component's real root: the measurable
  // <button> itself, confirmed by the absence of any wrapper ancestor.
  const target = document.querySelector<HTMLElement>('[data-testid="host-component"]')!
  expect(target.tagName).toBe('BUTTON')
  expect(target.hasAttribute('data-ui-tooltip')).toBe(true)
  expect(target.closest('.ui-button-badge-wrapper')).toBeNull()

  await screen.getByTestId('host-component').hover()
  await vi.waitFor(() => {
    expect(document.querySelector('.ui-tooltip-panel')?.textContent).toContain('On a component')
  })
  const positioner = document.querySelector<HTMLElement>('.ui-tooltip-positioner')!
  const tooltipRect = positioner.getBoundingClientRect()
  const buttonRect = target.getBoundingClientRect()
  // Anchored near the trigger, not clamped to the page's top-left corner
  expect(Math.abs(tooltipRect.left - buttonRect.left)).toBeLessThan(buttonRect.width + 40)
  expect(Math.abs(tooltipRect.top - buttonRect.top)).toBeLessThan(buttonRect.height + 40)
})
