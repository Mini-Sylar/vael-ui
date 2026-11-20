import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import TooltipAuditFixture from './fixtures/TooltipAuditFixture.vue'
import TooltipFixture from './fixtures/TooltipFixture.vue'
import { __resetTooltipWarmth } from '../src/composables/useTooltip'

beforeEach(() => {
  __resetTooltipWarmth()
  for (const el of document.querySelectorAll('.ui-tooltip-positioner')) el.remove()
})

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const panelText = () => document.querySelector('.ui-tooltip-panel')?.textContent?.trim()
const touch = { pointerType: 'touch', pointerId: 5, bubbles: true, isPrimary: true }

test('after Escape, moving onto the trigger’s own icon does not reopen the v-tooltip', async () => {
  const screen = await render(TooltipAuditFixture)
  await screen.getByTestId('named-icon').hover()
  await vi.waitFor(() => expect(panelText()).toBe('Delete'))

  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(document.querySelector('.ui-tooltip-panel')).toBeNull())

  await screen.getByTestId('named-icon-svg').hover()
  await wait(250)
  expect(document.querySelector('.ui-tooltip-panel')).toBeNull()

  // Leaving and coming back opens it again.
  await screen.getByTestId('plain').hover()
  await screen.getByTestId('named-icon').hover()
  await vi.waitFor(() => expect(panelText()).toBe('Delete'))
})

test('a tooltip that repeats the trigger’s name is not added to aria-describedby', async () => {
  const screen = await render(TooltipAuditFixture)
  const named = screen.getByTestId('named-icon').element()
  await screen.getByTestId('named-icon').hover()
  await vi.waitFor(() => expect(panelText()).toBe('Delete'))
  expect(named.hasAttribute('aria-describedby')).toBe(false)

  const text = screen.getByTestId('text').element()
  await screen.getByTestId('text').hover()
  await vi.waitFor(() => expect(panelText()).toBe('Save the file'))
  await vi.waitFor(() => expect(text.getAttribute('aria-describedby')).toBeTruthy())

  const close = screen.getByTestId('tooltip-close').element()
  await screen.getByTestId('tooltip-close').hover()
  await vi.waitFor(() => expect(panelText()).toBe('Close'))
  await wait(50)
  expect(close.hasAttribute('aria-describedby')).toBe(false)
})

test('v-tooltip text names an icon-only button with no name, and only removes its own label', async () => {
  const screen = await render(TooltipAuditFixture)
  const unnamed = screen.getByTestId('unnamed').element()
  expect(unnamed.getAttribute('aria-label')).toBe('Archive')
  // Named controls and plain text keep what they had.
  expect(screen.getByTestId('named-icon').element().getAttribute('aria-label')).toBe('Delete')
  expect(screen.getByTestId('text').element().hasAttribute('aria-label')).toBe(false)
  expect(screen.getByTestId('dot').element().hasAttribute('aria-label')).toBe(false)

  await screen.getByTestId('toggle-archive').click()
  await vi.waitFor(() => expect(unnamed.hasAttribute('aria-label')).toBe(false))
})

test('a long-press tooltip stays up after the finger lifts, and a tap elsewhere closes it', async () => {
  const screen = await render(TooltipFixture)
  const trigger = screen.getByTestId('trigger-a').element() as HTMLElement
  trigger.dispatchEvent(new PointerEvent('pointerdown', touch))
  await wait(550)
  await expect.element(screen.getByTestId('tip-a')).toBeVisible()

  // Touch sends pointerleave right after pointerup.
  trigger.dispatchEvent(new PointerEvent('pointerup', touch))
  trigger.dispatchEvent(new PointerEvent('pointerleave', { ...touch, bubbles: false }))
  await wait(300)
  expect(document.querySelector('[data-testid="tip-a"]')).not.toBeNull()

  document.body.dispatchEvent(new PointerEvent('pointerdown', touch))
  await vi.waitFor(() => expect(document.querySelector('[data-testid="tip-a"]')).toBeNull())
})

test('a long-press tooltip closes on its own 1500 ms after the finger lifts', async () => {
  const screen = await render(TooltipFixture)
  const trigger = screen.getByTestId('trigger-a').element() as HTMLElement
  trigger.dispatchEvent(new PointerEvent('pointerdown', touch))
  await wait(550)
  await expect.element(screen.getByTestId('tip-a')).toBeVisible()
  trigger.dispatchEvent(new PointerEvent('pointerup', touch))
  await wait(1200)
  expect(document.querySelector('[data-testid="tip-a"]')).not.toBeNull()
  await vi.waitFor(() => expect(document.querySelector('[data-testid="tip-a"]')).toBeNull(), {
    timeout: 1000,
  })
})

test('a v-tooltip long press ignores the pointerout that follows the lift', async () => {
  const screen = await render(TooltipAuditFixture)
  const target = screen.getByTestId('text').element() as HTMLElement
  target.dispatchEvent(new PointerEvent('pointerover', touch))
  await wait(50)
  target.dispatchEvent(new PointerEvent('pointerdown', touch))
  await wait(550)
  await vi.waitFor(() => expect(panelText()).toBe('Save the file'))

  target.dispatchEvent(new PointerEvent('pointerup', touch))
  target.dispatchEvent(new PointerEvent('pointerout', touch))
  await wait(300)
  expect(panelText()).toBe('Save the file')
})
