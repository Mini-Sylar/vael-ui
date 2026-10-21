// Real layout matters here (overlay hit-testing, transitions), so load the CSS
import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import DialogFixture from './fixtures/DialogFixture.vue'
import DialogChromeFixture from './fixtures/DialogChromeFixture.vue'
import DialogLongContentFixture from './fixtures/DialogLongContentFixture.vue'
import DialogFooterEdgeFixture from './fixtures/DialogFooterEdgeFixture.vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import type { DialogExposed } from '../src/components/Dialog/Dialog.vue'

function activeTestId() {
  return document.activeElement?.getAttribute('data-testid') ?? document.activeElement?.className
}

test('opens with dialog semantics, traps focus, escape closes and restores focus', async () => {
  const screen = await render(DialogFixture)
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
  expect(document.body.style.overflow).toBe('hidden')

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
  expect(document.body.style.overflow).toBe('')
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
    const screen = await render(DialogFixture)
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
  const screen = await render(DialogFixture) // short content: two inputs and a button
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(document.querySelector('.ui-dialog-body')).not.toBeNull())

  const body = document.querySelector<HTMLElement>('.ui-dialog-body')!
  expect(body.scrollHeight).toBeLessThanOrEqual(body.clientHeight) // sanity: genuinely not overflowing
  expect(body.classList.contains('scroll-fade')).toBe(false)
})

test('scrollFade prop toggles the .scroll-fade class on an actually-overflowing body, on by default', async () => {
  const screen = await render(DialogLongContentFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => {
    const body = document.querySelector<HTMLElement>('.ui-dialog-body')
    expect(body?.scrollHeight).toBeGreaterThan(body?.clientHeight ?? 0)
  })
  await vi.waitFor(() =>
    expect(document.querySelector('.ui-dialog-body')!.classList.contains('scroll-fade')).toBe(true),
  )

  await render(Dialog, { props: { open: true, scrollFade: false, ariaLabel: 'Fade off' } })
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-dialog-panel').length).toBe(2))
  const panels = [...document.querySelectorAll('.ui-dialog-panel')]
  const noFadePanel = panels.find((p) => p.getAttribute('aria-label') === 'Fade off')
  const noFadeBody = noFadePanel!.querySelector('.ui-dialog-body')
  expect(noFadeBody!.classList.contains('scroll-fade')).toBe(false)
})

test('overlay click closes with reason "outside"; slot close() works', async () => {
  const screen = await render(DialogFixture)
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

test('clicking a non-dismissable overlay keeps focus inside the dialog instead of dropping it to <body>', async () => {
  const screen = await render(Dialog, {
    props: { open: true, closeOnOverlay: false, 'aria-label': 'Required' },
    slots: { default: '<button data-testid="inner">Rotate</button>' },
  })
  await expect.element(page.getByRole('dialog')).toBeVisible()
  const inner = document.querySelector<HTMLElement>('[data-testid="inner"]')!
  inner.focus()

  const overlay = document.querySelector<HTMLElement>('.ui-dialog-overlay')!
  await page.elementLocator(overlay).click({ position: { x: 5, y: 5 } })
  await expect.element(page.getByRole('dialog')).toBeVisible()
  expect(document.activeElement).toBe(inner)
  await screen.unmount()
})

test('title/description wire ARIA automatically; footer slot renders actions', async () => {
  const screen = await render(DialogChromeFixture)
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
  const screen = await render(DialogFixture, { props: { veto: true } })
  await screen.getByTestId('trigger').click()
  await expect.element(page.getByRole('dialog')).toBeVisible()

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('last-reason')).toHaveTextContent('escape')
  await expect.element(screen.getByTestId('state')).toHaveTextContent('open')
  await expect.element(page.getByRole('dialog')).toBeVisible()
})

// Regression: with a footer, the body had no bottom padding, so focus rings and hover-grown controls at its end were clipped.
test('content at the end of a body with a footer is not clipped, and the gap above the footer is unchanged', async () => {
  const screen = await render(DialogFooterEdgeFixture)
  await expect.element(page.getByRole('dialog')).toBeVisible()
  const last = screen.getByTestId('last').element() as HTMLElement
  const body = document.querySelector<HTMLElement>('.ui-dialog-body')!
  const footerAction = screen.getByTestId('footer-action').element() as HTMLElement

  const lastRect = last.getBoundingClientRect()
  const clipBottom = body.getBoundingClientRect().top + body.clientHeight
  expect(lastRect.bottom + 3).toBeLessThanOrEqual(clipBottom)

  const gap = footerAction.getBoundingClientRect().top - lastRect.bottom
  expect(gap).toBeGreaterThanOrEqual(11)
  expect(gap).toBeLessThanOrEqual(13)
})

test('exposes the overlay as overlayEl, and null when modal is false', async () => {
  const { h, ref } = await import('vue')
  const modal = ref<DialogExposed | null>(null)
  const plain = ref<DialogExposed | null>(null)
  await render({
    render: () => [
      h(Dialog as never, { ref: modal, open: true, title: 'Modal' }),
      h(Dialog as never, { ref: plain, open: true, title: 'Plain', modal: false }),
    ],
  })
  await vi.waitFor(() => expect(modal.value?.overlayEl).toBeInstanceOf(HTMLElement))
  expect(modal.value!.overlayEl!.classList.contains('ui-dialog-overlay')).toBe(true)
  expect(document.querySelectorAll('.ui-dialog-overlay')).toHaveLength(1)
  expect(plain.value!.overlayEl).toBeNull()
})

test('forceMount keeps the overlay fade until the consumer sets its opacity inline', async () => {
  const { h, ref } = await import('vue')
  const forced = ref<DialogExposed | null>(null)
  const regular = ref<DialogExposed | null>(null)
  await render({
    render: () => [
      h(Dialog as never, { ref: forced, open: true, title: 'Forced', forceMount: true }),
      h(Dialog as never, { ref: regular, open: true, title: 'Regular' }),
    ],
  })
  await vi.waitFor(() => expect(forced.value?.overlayEl).toBeInstanceOf(HTMLElement))
  await vi.waitFor(() => expect(regular.value?.overlayEl).toBeInstanceOf(HTMLElement))
  const forcedOverlay = forced.value!.overlayEl!
  const regularOverlay = regular.value!.overlayEl!
  const fades = (el: HTMLElement) => {
    const style = getComputedStyle(el)
    return style.transitionProperty === 'opacity' && parseFloat(style.transitionDuration) > 0
  }
  // Untouched, both keep the built-in fade, so existing forceMount code looks the same.
  expect(fades(forcedOverlay)).toBe(true)
  expect(fades(regularOverlay)).toBe(true)

  // Driving opacity inline hands the forceMount overlay over: no transition to fight each frame.
  forcedOverlay.style.opacity = '0.3'
  regularOverlay.style.opacity = '0.3'
  expect(fades(forcedOverlay)).toBe(false)
  expect(getComputedStyle(forcedOverlay).opacity).toBe('0.3')
  // Without forceMount, an inline opacity (say from ui.overlay.style) keeps the fade.
  expect(fades(regularOverlay)).toBe(true)

  // Releasing it brings the fade back.
  forcedOverlay.style.removeProperty('opacity')
  expect(fades(forcedOverlay)).toBe(true)
})

test('with forceMount, an inline overlay opacity wins over the closing fade', async () => {
  const { h, ref } = await import('vue')
  const dialog = ref<DialogExposed | null>(null)
  let finish: (() => void) | undefined
  await render({
    render: () =>
      h(Dialog as never, {
        ref: dialog,
        open: true,
        title: 'Closing',
        forceMount: true,
        beforeClose: (done: () => void) => {
          finish = done
        },
      }),
  })
  await vi.waitFor(() => expect(dialog.value?.overlayEl).toBeInstanceOf(HTMLElement))
  const overlay = dialog.value!.overlayEl!
  overlay.style.opacity = '0.8'
  dialog.value!.close()
  await vi.waitFor(() => expect(dialog.value!.isClosing).toBe(true))
  // data-state="closing" would set opacity 0 behind a transition; the consumer's value holds.
  expect(getComputedStyle(overlay).opacity).toBe('0.8')
  finish?.()
})

test('openDialog exposes overlayEl on the handle and on useDialogRef()', async () => {
  const { defineComponent, h } = await import('vue')
  const { openDialog, useDialogRef } = await import('../src/composables/useDialogService')
  const DialogHost = (await import('../src/components/DialogHost/DialogHost.vue')).default
  let fromInside: ReturnType<typeof useDialogRef> | undefined
  const Body = defineComponent(() => {
    fromInside = useDialogRef()
    return () => h('p', 'Body')
  })
  await render({ render: () => h(DialogHost) })
  const handle = openDialog(Body, { title: 'Dynamic' })
  await vi.waitFor(() => expect(handle.overlayEl.value).toBeInstanceOf(HTMLElement))
  expect(handle.overlayEl.value!.classList.contains('ui-dialog-overlay')).toBe(true)
  expect(fromInside!.overlayEl).toBe(handle.overlayEl.value)
  handle.close()
  await handle.result
})

test('openDialog closed in the same tick still settles and leaves nothing open', async () => {
  const { defineComponent, h } = await import('vue')
  const { openDialog } = await import('../src/composables/useDialogService')
  const DialogHost = (await import('../src/components/DialogHost/DialogHost.vue')).default
  await render({ render: () => h(DialogHost) })
  const handle = openDialog(defineComponent({ render: () => h('p', 'Body') }), { title: 'Early' })
  handle.close('early')
  await expect(handle.result).resolves.toBe('early')
  await vi.waitFor(() => expect(document.querySelector('.ui-dialog')).toBeNull())
})

test('Escape that ends an IME composition does not close the dialog', async () => {
  const screen = await render(DialogFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(page.getByRole('dialog')).toBeVisible()
  const input = screen.getByTestId('first').element() as HTMLInputElement
  input.focus()

  input.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }),
  )
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true }))
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(screen.getByTestId('state').element().textContent).toBe('open')

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('state')).toHaveTextContent('closed')
})

// The test renderer stubs <Transition>, which would skip the exit these two are about.
const realTransitions = { global: { stubs: { transition: false } } }

test('the scroll lock holds until the exit animation ends, so a returning scrollbar cannot nudge the closing panel', async () => {
  const screen = await render(DialogFixture, realTransitions)
  await screen.getByTestId('trigger').click()
  await expect.element(page.getByRole('dialog')).toBeVisible()
  expect(document.body.style.overflow).toBe('hidden')
  // Fully open first, so the close plays a real exit.
  await vi.waitFor(() =>
    expect(getComputedStyle(document.querySelector('.ui-dialog-panel')!).opacity).toBe('1'),
  )

  await userEvent.keyboard('{Escape}')
  // Closed, but still fading out: the page must stay locked under it.
  await vi.waitFor(
    () => expect(document.querySelector('.ui-dialog[data-ui-leaving]')).not.toBeNull(),
    { interval: 5 },
  )
  expect(screen.getByTestId('state').element().textContent).toBe('closed')
  expect(document.body.style.overflow).toBe('hidden')

  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull())
  await vi.waitFor(() => expect(document.body.style.overflow).toBe(''))
})

test('reopening a dialog mid-exit keeps the scroll lock, and the next close still releases it', async () => {
  const screen = await render(DialogFixture, realTransitions)
  const trigger = screen.getByTestId('trigger')
  await trigger.click()
  await expect.element(page.getByRole('dialog')).toBeVisible()
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('state')).toHaveTextContent('closed')
  await trigger.click()
  await expect.element(screen.getByTestId('state')).toHaveTextContent('open')
  await new Promise((resolve) => setTimeout(resolve, 300))
  expect(document.body.style.overflow).toBe('hidden')

  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull())
  await vi.waitFor(() => expect(document.body.style.overflow).toBe(''))
})

test('origin="trigger" grows the panel out of the element that opened it', async () => {
  const open = shallowRef(false)
  const screen = await render(
    {
      render: () => [
        h(
          'button',
          {
            id: 'opener',
            style: 'position: fixed; left: 20px; top: 30px; width: 40px; height: 20px',
            onClick: () => (open.value = true),
          },
          'Open',
        ),
        h(Dialog as never, {
          open: open.value,
          'onUpdate:open': (v: boolean) => (open.value = v),
          origin: 'trigger',
          title: 'Details',
        }),
      ],
    },
    { global: { stubs: { transition: false } } },
  )
  const opener = screen.container.querySelector<HTMLButtonElement>('#opener')!
  opener.focus()
  opener.click()
  const panel = await vi.waitFor(() => {
    const el = document.querySelector<HTMLElement>('.ui-dialog-panel')
    expect(el?.style.transformOrigin).toBeTruthy()
    return el!
  })
  expect(panel.closest('.ui-dialog')!.getAttribute('data-origin')).toBe('trigger')
  const [x, y] = panel.style.transformOrigin.split(' ').map(parseFloat) as [number, number]
  const parent = (panel.offsetParent as HTMLElement).getBoundingClientRect()
  expect(Math.abs(parent.left + panel.offsetLeft + x - 40)).toBeLessThanOrEqual(1)
  expect(Math.abs(parent.top + panel.offsetTop + y - 40)).toBeLessThanOrEqual(1)
  open.value = false
})
