/**
 * "Unstyled mode": what still works if `vael-ui/style.css` is never imported?
 * Deliberately no `import '../src/style.css'` here — this file measures the
 * library with zero stylesheet loaded, same as a consumer who skins
 * everything themselves and never pulls in our CSS.
 *
 * The headless promise is about STATE, not appearance: aria-busy,
 * aria-modal, focus management, and disabled must all be correct with no
 * CSS at all. Visual presentation (spinner appearance, hit-area padding)
 * is allowed to degrade — but a component must never stop *functioning*
 * as its own required layout (e.g. a modal that no longer overlays
 * anything) without any CSS. Where that's true, the layout is inlined by
 * the component itself; see the STRUCTURAL comments in Dialog.vue/Button.vue.
 */
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import DialogFixture from './fixtures/DialogFixture.vue'
import ButtonFixture from './fixtures/ButtonFixture.vue'
import ToasterFixture from './fixtures/ToasterFixture.vue'
import { toast, useToastQueue } from '../src/composables/useToast'

test('dialog: focus trap, Escape, and focus-return work with zero CSS', async () => {
  const screen = render(DialogFixture)
  await screen.getByTestId('trigger').click()

  const dialog = document.querySelector('[role="dialog"]')!
  expect(dialog.getAttribute('aria-modal')).toBe('true')
  await vi.waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('state')).toHaveTextContent('closed')
  await vi.waitFor(() =>
    expect(document.activeElement?.getAttribute('data-testid')).toBe('trigger'),
  )
})

test('dialog: root/overlay/panel are still full-viewport and layered without any stylesheet', async () => {
  const screen = render(DialogFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeNull())

  // This is the structural guarantee: these three measurements must hold
  // even with zero CSS, or "click outside to close" and "sits above the
  // page" both silently break for any consumer who skins from scratch.
  const root = document.querySelector('.ui-dialog')!
  const overlay = document.querySelector('.ui-dialog-overlay')!
  const rootRect = root.getBoundingClientRect()
  const overlayRect = overlay.getBoundingClientRect()

  expect(getComputedStyle(root).position).toBe('fixed')
  expect(rootRect.width).toBeGreaterThan(0)
  expect(rootRect.height).toBeGreaterThan(0)
  expect(getComputedStyle(overlay).position).toBe('absolute')
  expect(overlayRect.width).toBe(rootRect.width)
  expect(overlayRect.height).toBe(rootRect.height)

  // Overlay click-to-close must still work — this only holds if the overlay
  // actually covers the viewport (the assertions above), not just if a
  // click handler happens to be attached.
  await page.elementLocator(overlay).click({ position: { x: 5, y: 5 } })
  await expect.element(screen.getByTestId('state')).toHaveTextContent('closed')
})

test('toaster: still floats fixed in its chosen corner with zero CSS', async () => {
  const { dismiss } = useToastQueue()
  const screen = render(ToasterFixture, { props: { position: 'top-left' } })
  toast('Unstyled toast')

  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).not.toBeNull())
  const toaster = document.querySelector('.ui-toaster')!
  const rect = toaster.getBoundingClientRect()

  // Structural guarantee: fixed positioning and a real corner offset, not
  // "wherever the Teleport target's normal document flow puts it".
  expect(getComputedStyle(toaster).position).toBe('fixed')
  expect(rect.top).toBeGreaterThan(0)
  expect(rect.top).toBeLessThan(50) // top-left: near the top edge, not mid-page
  expect(rect.left).toBeGreaterThan(0)
  expect(rect.left).toBeLessThan(50)

  dismiss()
  screen.unmount()
})

test('toaster: cards stay absolutely positioned and stacked (not a flat overlapping pile) with zero CSS', async () => {
  const { dismiss } = useToastQueue()
  const screen = render(ToasterFixture)
  toast('First', { duration: 10000 })
  toast('Second', { duration: 10000 })

  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toast').length).toBe(2))
  const cards = [...document.querySelectorAll<HTMLElement>('.ui-toast')]

  // Structural guarantee: position:absolute and a real per-card stack offset
  // (the `translate` longhand) both hold with no stylesheet — without them,
  // cards would render in plain document flow, or worse, absolutely
  // positioned with no offset at all (perfectly overlapping, illegible).
  for (const card of cards) {
    expect(getComputedStyle(card).position).toBe('absolute')
  }
  const translates = cards.map((el) => getComputedStyle(el).translate)
  expect(new Set(translates).size).toBe(2)

  dismiss()
  screen.unmount()
})

test('button: aria-busy and disabled stay correct while loading, even unstyled', async () => {
  let resolveTask!: () => void
  const task = () => new Promise<void>((resolve) => (resolveTask = resolve))
  const screen = render(ButtonFixture, { props: { task } })
  const button = screen.getByRole('button')

  await button.click()
  await expect.element(button).toHaveAttribute('aria-busy', 'true')
  await expect.element(button).toBeDisabled()

  resolveTask()
  await expect.element(button).not.toHaveAttribute('aria-busy')
  await expect.element(button).not.toBeDisabled()
})
