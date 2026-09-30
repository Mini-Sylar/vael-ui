import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import AccordionFixture from './fixtures/AccordionFixture.vue'

function panelFor(triggerName: string) {
  const button = [...document.querySelectorAll<HTMLElement>('.ui-accordion-trigger')].find((el) =>
    el.textContent?.includes(triggerName),
  )!
  return document.getElementById(button.getAttribute('aria-controls')!)!
}

test('single mode: opening one item closes the previously open one', async () => {
  await render(AccordionFixture, { props: { initial: 'first' } })
  expect(panelFor('First section').getAttribute('aria-labelledby')).not.toBeNull()
  await expect
    .element(page.getByRole('button', { name: 'First section' }))
    .toHaveAttribute('aria-expanded', 'true')

  await page.getByRole('button', { name: 'Second section' }).click()
  await expect
    .element(page.getByRole('button', { name: 'Second section' }))
    .toHaveAttribute('aria-expanded', 'true')
  await expect
    .element(page.getByRole('button', { name: 'First section' }))
    .toHaveAttribute('aria-expanded', 'false')
})

test('multiple mode allows several items open at once', async () => {
  await render(AccordionFixture, { props: { multiple: true } })
  await page.getByRole('button', { name: 'First section' }).click()
  await page.getByRole('button', { name: 'Second section' }).click()

  await expect
    .element(page.getByRole('button', { name: 'First section' }))
    .toHaveAttribute('aria-expanded', 'true')
  await expect
    .element(page.getByRole('button', { name: 'Second section' }))
    .toHaveAttribute('aria-expanded', 'true')
})

test('collapsible=false keeps the last open item open', async () => {
  await render(AccordionFixture, { props: { initial: 'first', collapsible: false } })
  await page.getByRole('button', { name: 'First section' }).click()
  await expect
    .element(page.getByRole('button', { name: 'First section' }))
    .toHaveAttribute('aria-expanded', 'true')
})

test('a disabled item is a native disabled button and stays collapsed', async () => {
  const screen = await render(AccordionFixture)
  const disabledTrigger = screen.getByRole('button', { name: 'Disabled section' })
  await expect.element(disabledTrigger).toBeDisabled()
  await expect.element(disabledTrigger).toHaveAttribute('aria-expanded', 'false')
  expect(panelFor('Disabled section').dataset.state).toBe('closed')
})

test('aria wiring: aria-controls/aria-labelledby pair the trigger and role="region" panel', async () => {
  await render(AccordionFixture)
  const trigger = document.querySelector<HTMLElement>('.ui-accordion-trigger')!
  const panelId = trigger.getAttribute('aria-controls')!
  const panel = document.getElementById(panelId)!
  expect(panel.getAttribute('role')).toBe('region')
  expect(panel.getAttribute('aria-labelledby')).toBe(trigger.id)
})

test('height pins to a concrete px value while animating, then releases to auto once settled', async () => {
  await render(AccordionFixture)
  const panel = panelFor('First section')
  expect(panel.style.blockSize).toBe('0px')

  await page.getByRole('button', { name: 'First section' }).click()
  // Mid-animation: pinned to the real measured px, not '0px' or auto.
  await vi.waitFor(() => {
    const height = Number.parseFloat(panel.style.blockSize)
    expect(Number.isFinite(height) && height > 0).toBe(true)
  })
  expect(panel.dataset.state).toBe('opening')

  await vi.waitFor(() => expect(panel.dataset.state).toBe('open'))
  expect(panel.style.blockSize).toBe('')

  await page.getByRole('button', { name: 'First section' }).click()
  await vi.waitFor(() => expect(panel.dataset.state).toBe('closed'))
  expect(panel.style.blockSize).toBe('0px')
})

test('motionCss=false skips the pin/transition dance — no inline block-size transition state', async () => {
  await render(AccordionFixture, { props: { motionCss: false } })
  const panel = panelFor('First section')

  await page.getByRole('button', { name: 'First section' }).click()
  await vi.waitFor(() => expect(panel.dataset.state).toBe('open'))
  expect(panel.style.blockSize).toBe('')
})

test('rapid double-toggle (open then close before settling) does not strand a pinned height', async () => {
  await render(AccordionFixture)
  const panel = panelFor('First section')
  const trigger = page.getByRole('button', { name: 'First section' })

  await trigger.click()
  await vi.waitFor(() => expect(panel.dataset.state).toBe('opening'))
  await trigger.click()

  await vi.waitFor(() => expect(panel.dataset.state).toBe('closed'))
  expect(panel.style.blockSize).toBe('0px')
  expect(panel.style.visibility).toBe('hidden')
})

test('ArrowDown/ArrowUp/Home/End move focus between enabled triggers, wrapping at the ends', async () => {
  const screen = await render(AccordionFixture)
  const triggers = screen.container.querySelectorAll<HTMLButtonElement>('.ui-accordion-trigger')
  triggers[0]!.focus()
  await userEvent.keyboard('{ArrowDown}')
  expect(document.activeElement).toBe(triggers[1])
  // The third item is disabled, so the next stop wraps back to the first.
  await userEvent.keyboard('{ArrowDown}')
  expect(document.activeElement).toBe(triggers[0])
  await userEvent.keyboard('{ArrowUp}')
  expect(document.activeElement).toBe(triggers[1])
  await userEvent.keyboard('{Home}')
  expect(document.activeElement).toBe(triggers[0])
  await userEvent.keyboard('{End}')
  expect(document.activeElement).toBe(triggers[1])
})

test('trigger text and panel content share the same inline start edge', async () => {
  const screen = await render(AccordionFixture, { props: { initial: 'first', motionCss: false } })
  const trigger = screen.container.querySelector<HTMLElement>('.ui-accordion-trigger-title')!
  const body = screen.container.querySelector<HTMLElement>('.ui-accordion-body')!
  const range = document.createRange()
  range.selectNodeContents(body)
  expect(range.getBoundingClientRect().left).toBeCloseTo(trigger.getBoundingClientRect().left, 1)
})

test('motionCss=false removes the panel height transition so a consumer tween is not smoothed by it', async () => {
  const screen = await render(AccordionFixture, { props: { motionCss: false } })
  const panel = screen.container.querySelector<HTMLElement>('.ui-accordion-panel')!
  expect(getComputedStyle(panel).transitionDuration).toBe('0s')
})
