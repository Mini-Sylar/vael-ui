import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { effectScope, shallowRef } from 'vue'
import TooltipFixture from './fixtures/TooltipFixture.vue'
import TooltipHostFixture from './fixtures/TooltipHostFixture.vue'
import TooltipInDialogFixture from './fixtures/TooltipInDialogFixture.vue'
import { __resetTooltipWarmth } from '../src/composables/useTooltip'
import { vTooltipVapor } from '../src/directives/vTooltip'

beforeEach(() => {
  __resetTooltipWarmth()
  // Teleported positioners can outlive a fixture torn down mid-transition.
  for (const el of document.querySelectorAll('.ui-tooltip-positioner')) el.remove()
})

test('cold open waits for the delay; leave hides after the grace period', async () => {
  const screen = await render(TooltipFixture)
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
  const screen = await render(TooltipFixture)

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
  const screen = await render(TooltipFixture)
  // Listeners attach reactively post-mount — tabbing immediately can race them.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

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
  const screen = await render(TooltipFixture)
  await screen.getByTestId('trigger-slot').hover()
  await expect.element(screen.getByTestId('tip-slot')).toBeVisible()
})

test('v-tooltip + TooltipHost: delegation shows string content and side modifier applies', async () => {
  const screen = await render(TooltipHostFixture)

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
  const screen = await render(TooltipHostFixture)
  const target = document.querySelector<HTMLElement>('[data-testid="host-conditional"]')!

  // No hint bound yet: no directive attribute, no hover-triggered panel.
  expect(target.hasAttribute('data-ui-tooltip')).toBe(false)
  await screen.getByTestId('host-conditional').hover()
  // Real wait: outlasts the 120ms open delay.
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
  const screen = await render(TooltipHostFixture)

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

test("Tooltip adds its id to the trigger's aria-describedby without dropping the consumer's own ids", async () => {
  const screen = await render(TooltipFixture)
  const trigger = screen.getByTestId('trigger-desc')

  await trigger.hover()
  await expect.element(screen.getByTestId('tip-desc')).toBeVisible()
  const tipId = document.querySelector('[data-testid="tip-desc"]')!.closest('[role="tooltip"]')!.id
  await vi.waitFor(() => {
    expect(trigger.element().getAttribute('aria-describedby')?.split(' ')).toEqual([
      'field-error',
      tipId,
    ])
  })

  await screen.getByTestId('plain').hover()
  await vi.waitFor(() => {
    expect(document.querySelector('[data-testid="tip-desc"]')).toBeNull()
  })
  expect(trigger.element().getAttribute('aria-describedby')).toBe('field-error')
})

test("v-tooltip keeps the target's own aria-describedby ids, also when the tooltip moves to another target", async () => {
  const screen = await render(TooltipHostFixture)
  const target = screen.getByTestId('host-desc').element()

  await screen.getByTestId('host-desc').hover()
  await vi.waitFor(() => {
    expect(document.querySelector('.ui-tooltip-panel')?.textContent).toContain(
      'Has own description',
    )
  })
  const tipId = document.querySelector('.ui-tooltip-panel')!.id
  await vi.waitFor(() => {
    expect(target.getAttribute('aria-describedby')?.split(' ')).toEqual(['hint-id', tipId])
  })

  // Moves while open: the old target gets back exactly its own ids.
  await screen.getByTestId('host-a').hover()
  await vi.waitFor(() => {
    expect(document.querySelector('.ui-tooltip-panel')?.textContent).toContain(
      'Saved via directive',
    )
  })
  expect(target.getAttribute('aria-describedby')).toBe('hint-id')
})

test('v-tooltip content that changes while visible updates the open tooltip', async () => {
  const screen = await render(TooltipHostFixture)

  await screen.getByTestId('host-copy').hover()
  await vi.waitFor(() => {
    expect(document.querySelector('.ui-tooltip-panel')?.textContent?.trim()).toBe('Copy')
  })
  // Programmatic click: a real one would count as a press and close the tooltip.
  const copy = screen.getByTestId('host-copy').element() as HTMLElement
  copy.click()
  await vi.waitFor(() => {
    expect(document.querySelector('.ui-tooltip-panel')?.textContent?.trim()).toBe('Copied!')
  })
})

test('vTooltipVapor content that changes while visible updates the open tooltip', async () => {
  const screen = await render(TooltipHostFixture)
  const label = shallowRef('Copy')
  const el = document.createElement('button')
  el.textContent = 'Vapor copy'
  el.dataset.testid = 'vapor-copy'
  screen.container.append(el)
  const scope = effectScope()
  scope.run(() => vTooltipVapor(el, () => label.value))

  await screen.getByTestId('vapor-copy').hover()
  await vi.waitFor(() => {
    expect(document.querySelector('.ui-tooltip-panel')?.textContent?.trim()).toBe('Copy')
  })
  label.value = 'Copied!'
  await vi.waitFor(() => {
    expect(document.querySelector('.ui-tooltip-panel')?.textContent?.trim()).toBe('Copied!')
  })
  scope.stop()
})

test('Escape on a focus-opened tooltip inside a Dialog closes only the tooltip', async () => {
  const screen = await render(TooltipInDialogFixture)
  const inner = screen.getByTestId('inner')
  await expect.element(inner).toBeVisible()
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

  for (let i = 0; i < 8 && document.activeElement !== inner.element(); i++) {
    await userEvent.keyboard('{Tab}')
  }
  expect(document.activeElement).toBe(inner.element())
  await expect.element(screen.getByTestId('tip-inner')).toBeVisible()

  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => {
    expect(document.querySelector('[data-testid="tip-inner"]')).toBeNull()
  })
  await new Promise((r) => setTimeout(r, 50))
  expect(screen.getByTestId('dialog-open').element().textContent).toBe('true')

  // A second Escape, with no tooltip showing, still closes the Dialog.
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('dialog-open')).toHaveTextContent('false')
})

test('a touch long-press shows the tooltip and swallows the click that follows the release', async () => {
  const screen = await render(TooltipFixture)
  const trigger = screen.getByTestId('trigger-a').element() as HTMLElement
  const clicks = vi.fn()
  trigger.addEventListener('click', clicks)
  const touch = { pointerType: 'touch', pointerId: 7, bubbles: true, isPrimary: true }

  trigger.dispatchEvent(new PointerEvent('pointerdown', touch))
  // onLongPress fires after 500ms of holding still: that elapsed time is the behaviour under test.
  await new Promise((resolve) => setTimeout(resolve, 550))
  await expect.element(screen.getByTestId('tip-a')).toBeVisible()

  trigger.dispatchEvent(new PointerEvent('pointerup', touch))
  trigger.click()
  expect(clicks).not.toHaveBeenCalled()
})
