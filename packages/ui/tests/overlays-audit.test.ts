import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import Tour from '../src/components/Tour/Tour.vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import Popover from '../src/components/Popover/Popover.vue'
import BottomSheet from '../src/components/BottomSheet/BottomSheet.vue'
import DialogHost from '../src/components/DialogHost/DialogHost.vue'
import PopoverHost from '../src/components/PopoverHost/PopoverHost.vue'
import { confirmAction } from '../src/composables/confirmAction'
import { openDialog } from '../src/composables/useDialogService'
import { openPopover } from '../src/composables/usePopoverService'
import BottomSheetFixture from './fixtures/BottomSheetFixture.vue'

const real = { global: { stubs: { transition: false, 'transition-group': false } } }
const byTestId = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!

const cleanups: (() => void)[] = []
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn())
})

function tourPage(steps: object[]) {
  const open = shallowRef(false)
  return {
    open,
    view: () => [
      h('button', { id: 'tour-target' }, 'Target'),
      h(Tour as never, {
        open: open.value,
        'onUpdate:open': (v: boolean) => (open.value = v),
        steps,
      }),
    ],
  }
}

test('Tour: a modal tour opens on Next, and Tab reaches an interactive target without aria-modal', async () => {
  const { open, view } = tourPage([
    { target: '#tour-target', title: 'First', description: 'About the target' },
    { target: '#tour-target', title: 'Second' },
  ])
  await render(view, real)
  open.value = true
  const callout = page.getByRole('dialog', { name: 'First' })
  await expect.element(callout).toBeVisible()
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Next'))
  expect(callout.element().hasAttribute('aria-modal')).toBe(false)

  // Callout first, then the target, then round again.
  const seen: string[] = []
  for (let i = 0; i < 3; i++) {
    await userEvent.keyboard('{Tab}')
    seen.push(document.activeElement?.textContent?.trim() ?? '')
  }
  expect(seen).toEqual(['Target', 'Skip', 'Next'])
})

test('Tour: a step with disableInteraction keeps aria-modal and Tab inside the callout', async () => {
  const { open, view } = tourPage([
    { target: '#tour-target', title: 'Only', disableInteraction: true },
  ])
  await render(view, real)
  open.value = true
  const callout = page.getByRole('dialog', { name: 'Only' })
  await expect.element(callout).toHaveAttribute('aria-modal', 'true')
  await vi.waitFor(() => expect(callout.element().contains(document.activeElement)).toBe(true))
  for (let i = 0; i < 4; i++) {
    await userEvent.keyboard('{Tab}')
    expect(callout.element().contains(document.activeElement)).toBe(true)
  }
})

test('Tour: the visible title names the callout and the description describes it', async () => {
  const { open, view } = tourPage([
    { target: '#tour-target', title: 'First', description: 'Details' },
  ])
  await render(view, real)
  open.value = true
  const callout = page.getByRole('dialog', { name: 'First' })
  await expect.element(callout).toBeVisible()
  const el = callout.element()
  expect(el.hasAttribute('aria-label')).toBe(false)
  expect(document.getElementById(el.getAttribute('aria-labelledby')!)?.tagName).toBe('H2')
  expect(document.getElementById(el.getAttribute('aria-describedby')!)?.textContent?.trim()).toBe(
    'Details',
  )
})

test('confirmAction popover: an alertdialog named by its title, with focus on Cancel', async () => {
  await render(() => [h(PopoverHost), h('button', { 'data-testid': 'anchor' }, 'Delete')], real)
  const handle = confirmAction({
    surface: 'popover',
    triggerEl: byTestId('anchor'),
    title: 'Delete row?',
    description: 'This cannot be undone.',
  })
  const alert = page.getByRole('alertdialog', { name: 'Delete row?' })
  await expect.element(alert).toBeVisible()
  await expect.element(alert).toHaveAccessibleDescription('This cannot be undone.')
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Cancel'))
  handle.close(false)
  expect(await handle.result).toBe(false)
})

test('confirmAction dialog: an alertdialog by default, opening on Cancel rather than the ×', async () => {
  await render(() => h(DialogHost), real)
  const handle = confirmAction({ title: 'Discard changes?' })
  await expect.element(page.getByRole('alertdialog', { name: 'Discard changes?' })).toBeVisible()
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Cancel'))
  handle.close(false)
  await handle.result
})

test('Popover: closing from the trigger asks open-change and beforeClose', async () => {
  const open = shallowRef(false)
  const reasons: string[] = []
  let allow = false
  await render(
    () =>
      h(
        Popover as never,
        {
          open: open.value,
          'onUpdate:open': (v: boolean) => (open.value = v),
          openOnTriggerClick: true,
          beforeClose: () => allow,
          onOpenChange: (_v: boolean, details: { reason: string }) => reasons.push(details.reason),
        },
        { trigger: () => h('button', { 'data-testid': 'trigger' }, 'Toggle'), default: () => 'Hi' },
      ),
    real,
  )
  await userEvent.click(byTestId('trigger'))
  await vi.waitFor(() => expect(open.value).toBe(true))
  await userEvent.click(byTestId('trigger'))
  await vi.waitFor(() => expect(reasons).toEqual(['trigger']))
  expect(open.value).toBe(true)
  allow = true
  await userEvent.click(byTestId('trigger'))
  await vi.waitFor(() => expect(open.value).toBe(false))
})

test('openDialog: a refused close() can be retried, and a later Escape settles with nothing', async () => {
  await render(() => h(DialogHost), real)
  let refuse = true
  const Body = defineComponent({ setup: () => () => h('button', 'Inside') })
  const handle = openDialog(Body, {
    'aria-label': 'Svc',
    onOpenChange: (_v: boolean, details: { cancel: () => void }) => refuse && details.cancel(),
  } as never)
  await expect.element(page.getByRole('dialog', { name: 'Svc' })).toBeVisible()
  handle.close('first')
  await new Promise((r) => setTimeout(r, 50))
  await expect.element(page.getByRole('dialog', { name: 'Svc' })).toBeVisible()
  refuse = false
  await userEvent.keyboard('{Escape}')
  expect(await handle.result).toBeUndefined()

  // A retried close() goes through.
  refuse = true
  const again = openDialog(Body, {
    'aria-label': 'Svc2',
    onOpenChange: (_v: boolean, details: { cancel: () => void }) => refuse && details.cancel(),
  } as never)
  await expect.element(page.getByRole('dialog', { name: 'Svc2' })).toBeVisible()
  again.close('no')
  await new Promise((r) => setTimeout(r, 50))
  refuse = false
  again.close('yes')
  expect(await again.result).toBe('yes')
})

test('openPopover: a close() refused by beforeClose can be retried', async () => {
  await render(() => [h(PopoverHost), h('button', { 'data-testid': 'anchor' }, 'Anchor')], real)
  let allow = false
  const Body = defineComponent({ setup: () => () => h('p', 'Popped') })
  const handle = openPopover(Body, {
    triggerEl: byTestId('anchor'),
    beforeClose: async () => allow,
  })
  await expect.element(page.getByText('Popped')).toBeVisible()
  handle.close('no')
  await new Promise((r) => setTimeout(r, 50))
  await expect.element(page.getByText('Popped')).toBeVisible()
  allow = true
  handle.close('yes')
  expect(await handle.result).toBe('yes')
})

function dialogPage(props: Record<string, unknown>, body: () => unknown) {
  const open = shallowRef(false)
  const view = () => [
    h('button', { 'data-testid': 'opener', onClick: () => (open.value = true) }, 'Open'),
    h(
      Dialog as never,
      { open: open.value, 'onUpdate:open': (v: boolean) => (open.value = v), ...props },
      { default: body },
    ),
  ]
  return { open, view }
}

test('Dialog: opening focuses the body before the maximize and close buttons, or [autofocus]', async () => {
  const { open, view } = dialogPage({ title: 'Edit', maximizable: true }, () => [
    h('button', 'First'),
    h('input', { 'aria-label': 'Name' }),
  ])
  await render(view, real)
  await userEvent.click(byTestId('opener'))
  await vi.waitFor(() => expect(document.activeElement?.textContent).toBe('First'))
  open.value = false
  await vi.waitFor(() => expect(document.activeElement).toBe(byTestId('opener')))
})

test('Dialog: [autofocus] wins over the first control', async () => {
  const { view } = dialogPage({ title: 'Edit' }, () => [
    h('button', 'First'),
    h('input', { 'aria-label': 'Name', autofocus: true }),
  ])
  await render(view, real)
  await userEvent.click(byTestId('opener'))
  await vi.waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toBe('Name'))
})

test('Dialog: a non-modal dialog takes focus on open and hands it back on close', async () => {
  const { open, view } = dialogPage({ title: 'Panel', modal: false }, () => h('button', 'Inside'))
  await render(view, real)
  await userEvent.click(byTestId('opener'))
  await vi.waitFor(() => expect(document.activeElement?.textContent).toBe('Inside'))
  open.value = false
  await vi.waitFor(() => expect(document.activeElement).toBe(byTestId('opener')))
})

test('Dialog: a non-modal dialog leaves focus alone on close once the user moved on', async () => {
  const { open, view } = dialogPage({ title: 'Panel', modal: false }, () => h('button', 'Inside'))
  await render(() => [view(), h('input', { 'data-testid': 'elsewhere' })], real)
  await userEvent.click(byTestId('opener'))
  await vi.waitFor(() => expect(document.activeElement?.textContent).toBe('Inside'))
  byTestId('elsewhere').focus()
  open.value = false
  await nextTick()
  await new Promise((r) => setTimeout(r, 50))
  expect(document.activeElement).toBe(byTestId('elsewhere'))
})

test('Popover: a touch that starts a scroll outside does not close it; a tap does', async () => {
  const open = shallowRef(false)
  await render(
    () => [
      h('div', { 'data-testid': 'outside', style: 'block-size: 40px' }, 'Page'),
      h(
        Popover as never,
        {
          open: open.value,
          'onUpdate:open': (v: boolean) => (open.value = v),
          triggerEl: document.querySelector('[data-testid="outside"]'),
        },
        () => 'Panel',
      ),
    ],
    real,
  )
  open.value = true
  await expect.element(page.getByText('Panel')).toBeVisible()
  // The trigger never counts as outside, so press on the page body.
  const body = (type: string, pointerId: number) =>
    document.body.dispatchEvent(
      new PointerEvent(type, { pointerId, pointerType: 'touch', bubbles: true }),
    )
  body('pointerdown', 5)
  await nextTick()
  expect(open.value).toBe(true)
  body('pointercancel', 5)
  body('pointerup', 5)
  await nextTick()
  expect(open.value).toBe(true)

  body('pointerdown', 6)
  body('pointerup', 6)
  await vi.waitFor(() => expect(open.value).toBe(false))
})

test('BottomSheet: a closed sheet listens to no viewport resize', async () => {
  const target = window.visualViewport ?? window
  const add = vi.spyOn(target, 'addEventListener')
  cleanups.push(() => add.mockRestore())
  const screen = await render(BottomSheetFixture)
  await nextTick()
  expect(add.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(0)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() =>
    expect(add.mock.calls.filter(([type]) => type === 'resize').length).toBeGreaterThan(0),
  )
})

test('BottomSheet: a drag promoted from the content holds the pointer, and losing it settles', async () => {
  const screen = await render(BottomSheetFixture)
  await screen.getByTestId('trigger').click()
  const panel = () => document.querySelector<HTMLElement>('.ui-bottom-sheet-panel')!
  const content = () => document.querySelector<HTMLElement>('.ui-bottom-sheet-content')!
  await vi.waitFor(() => expect(panel().getBoundingClientRect().top).toBeLessThan(innerHeight))
  await new Promise((r) => setTimeout(r, 600))
  content().scrollTop = 0
  const capture = vi.spyOn(Element.prototype, 'setPointerCapture')
  cleanups.push(() => capture.mockRestore())
  const pointerId = 1
  const fire = (type: string, y: number) =>
    content().dispatchEvent(
      new PointerEvent(type, { clientX: 100, clientY: y, pointerId, bubbles: true }),
    )
  fire('pointerdown', 200)
  fire('pointermove', 230)
  await vi.waitFor(() => expect(content().dataset.dragging).toBe('true'))
  expect(capture.mock.contexts).toContain(panel())
  panel().dispatchEvent(new PointerEvent('lostpointercapture', { pointerId, bubbles: true }))
  await vi.waitFor(() => expect(content().dataset.dragging).toBeUndefined())
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('BottomSheet: the title is a heading', async () => {
  await render(() => h(BottomSheet as never, { open: true, title: 'Filters' }, () => 'Body'), real)
  await expect.element(page.getByRole('heading', { name: 'Filters', level: 2 })).toBeVisible()
})
