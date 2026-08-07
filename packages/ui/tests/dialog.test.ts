// Real layout matters here (overlay hit-testing, transitions), so load the CSS
import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import DialogFixture from './fixtures/DialogFixture.vue'
import DialogChromeFixture from './fixtures/DialogChromeFixture.vue'
import DialogLongContentFixture from './fixtures/DialogLongContentFixture.vue'
import Dialog from '../src/components/Dialog/Dialog.vue'

function activeTestId() {
  return document.activeElement?.getAttribute('data-testid') ?? document.activeElement?.className
}

test('opens with dialog semantics, traps focus, escape closes and restores focus', async () => {
  const screen = render(DialogFixture)
  const trigger = screen.getByTestId('trigger')
  await trigger.click()

  const dialog = page.getByRole('dialog')
  await expect.element(dialog).toBeVisible()
  await expect.element(dialog).toHaveAttribute('aria-modal', 'true')
  await expect.element(dialog).toHaveAccessibleName('Example dialog')

  // Focus moved into the panel (first focusable is the built-in close button)
  await vi.waitFor(() => {
    expect(document.querySelector('[role="dialog"]')!.contains(document.activeElement)).toBe(true)
  })
  expect(document.documentElement.style.overflow).toBe('hidden')

  // Tab cycles forward through panel content and wraps
  expect(document.activeElement!.className).toContain('ui-dialog-close')
  await userEvent.keyboard('{Tab}')
  expect(activeTestId()).toBe('first')
  await userEvent.keyboard('{Tab}')
  expect(activeTestId()).toBe('second')
  await userEvent.keyboard('{Tab}')
  expect(activeTestId()).toBe('done')
  await userEvent.keyboard('{Tab}')
  expect(document.activeElement!.className).toContain('ui-dialog-close')

  // Shift+Tab wraps backwards from the first focusable
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
  expect(activeTestId()).toBe('done')

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('state')).toHaveTextContent('closed')
  await expect.element(screen.getByTestId('last-reason')).toHaveTextContent('escape')

  // Focus returns to the trigger; panel leaves the DOM after the 150ms exit
  await vi.waitFor(() => expect(activeTestId()).toBe('trigger'))
  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull())
  expect(document.documentElement.style.overflow).toBe('')
})

test('scroll lock compensates for the scrollbar width it removes, and restores it on close', async () => {
  // This suite runs under Chromium with overlay scrollbars (0 reclaimed
  // width even with genuinely overflowing content — confirmed directly:
  // window.innerWidth - document.documentElement.clientWidth is 0 here
  // regardless of page content), so there's no platform-real scrollbar to
  // measure against deterministically. Stub the two DOM reads the
  // component's width calculation is built from instead — this exercises
  // the actual compensation logic/math rather than depending on whatever a
  // given OS/browser/CI runner's scrollbar rendering happens to be.
  const clientWidthSpy = vi
    .spyOn(document.documentElement, 'clientWidth', 'get')
    .mockReturnValue(window.innerWidth - 17) // simulate a classic 17px scrollbar

  try {
    const screen = render(DialogFixture)
    const previousPaddingRight = document.body.style.paddingRight
    await screen.getByTestId('trigger').click()
    await expect.element(page.getByRole('dialog')).toBeVisible()

    // The removed scrollbar's width must be given back as body padding, or
    // the page visibly shifts left the instant the dialog opens.
    const paddingRight = Number.parseFloat(getComputedStyle(document.body).paddingRight)
    expect(paddingRight).toBeCloseTo(17, 0)

    await userEvent.keyboard('{Escape}')
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull())
    expect(document.body.style.paddingRight).toBe(previousPaddingRight)
  } finally {
    clientWidthSpy.mockRestore()
  }
})

test('scroll-fade only applies when the body actually overflows — never on short content', async () => {
  // .scroll-fade's mask can't distinguish "not scrollable" from "at rest,
  // more below" on its own — both read as 0% on the scroll(self) timeline.
  // Ungated, every dialog gets a permanent bottom fade regardless of overflow.
  const screen = render(DialogFixture) // short content: two inputs and a button
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(document.querySelector('.ui-dialog-body')).not.toBeNull())

  const body = document.querySelector<HTMLElement>('.ui-dialog-body')!
  expect(body.scrollHeight).toBeLessThanOrEqual(body.clientHeight) // sanity: genuinely not overflowing
  expect(body.classList.contains('scroll-fade')).toBe(false)
})

test('scrollFade prop toggles the .scroll-fade class on an actually-overflowing body, on by default', async () => {
  const screen = render(DialogLongContentFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => {
    const body = document.querySelector<HTMLElement>('.ui-dialog-body')
    expect(body?.scrollHeight).toBeGreaterThan(body?.clientHeight ?? 0)
  })
  await vi.waitFor(() =>
    expect(document.querySelector('.ui-dialog-body')!.classList.contains('scroll-fade')).toBe(true),
  )

  render(Dialog, { props: { open: true, scrollFade: false, ariaLabel: 'Fade off' } })
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-dialog-panel').length).toBe(2))
  const panels = [...document.querySelectorAll('.ui-dialog-panel')]
  const noFadePanel = panels.find((p) => p.getAttribute('aria-label') === 'Fade off')
  const noFadeBody = noFadePanel!.querySelector('.ui-dialog-body')
  expect(noFadeBody!.classList.contains('scroll-fade')).toBe(false)
})

test('overlay click closes with reason "outside"; slot close() works', async () => {
  const screen = render(DialogFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(page.getByRole('dialog')).toBeVisible()

  const overlay = document.querySelector<HTMLElement>('.ui-dialog-overlay')!
  await page.elementLocator(overlay).click({ position: { x: 5, y: 5 } })
  await expect.element(screen.getByTestId('state')).toHaveTextContent('closed')
  await expect.element(screen.getByTestId('last-reason')).toHaveTextContent('outside')

  // Reopen and close from the slot-exposed close()
  await screen.getByTestId('trigger').click()
  await screen.getByTestId('done').click()
  await expect.element(screen.getByTestId('state')).toHaveTextContent('closed')
  await expect.element(screen.getByTestId('last-reason')).toHaveTextContent('programmatic')
})

test('title/description wire ARIA automatically; footer slot renders actions', async () => {
  const screen = render(DialogChromeFixture)
  await screen.getByTestId('trigger').click()

  const dialog = page.getByRole('dialog')
  await expect.element(dialog).toBeVisible()
  // aria-labelledby / aria-describedby resolve from the title/description props
  await expect.element(dialog).toHaveAccessibleName('Delete workspace')
  await expect.element(dialog).toHaveAccessibleDescription('This action cannot be undone.')
  expect(document.querySelector('.ui-dialog-header')).not.toBeNull()
  expect(document.querySelector('.ui-dialog-panel--sm')).not.toBeNull()

  // Footer close() works
  await expect.element(page.getByRole('button', { name: 'Delete' })).toBeVisible()
  await screen.getByTestId('cancel').click()
  await expect.element(screen.getByTestId('state')).toHaveTextContent('closed')
})

test('details.cancel() vetoes the close', async () => {
  const screen = render(DialogFixture, { props: { veto: true } })
  await screen.getByTestId('trigger').click()
  await expect.element(page.getByRole('dialog')).toBeVisible()

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('last-reason')).toHaveTextContent('escape')
  await expect.element(screen.getByTestId('state')).toHaveTextContent('open')
  await expect.element(page.getByRole('dialog')).toBeVisible()
})
