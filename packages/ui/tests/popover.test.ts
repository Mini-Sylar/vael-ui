import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import Popover from '../src/components/Popover/Popover.vue'
import PopoverFixture from './fixtures/PopoverFixture.vue'
import PopoverOpenAtMountFixture from './fixtures/PopoverOpenAtMountFixture.vue'

function positioner(): HTMLElement {
  const el = document.querySelector<HTMLElement>('.ui-popover-positioner')
  if (!el) throw new Error('positioner not in DOM')
  return el
}

test('#trigger slot: click opens, panel teleports to body, attrs land on the panel', async () => {
  const screen = await render(PopoverFixture)
  expect(document.querySelector('.ui-popover-positioner')).toBeNull()

  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('content')).toBeVisible()

  expect(screen.container.contains(positioner())).toBe(false)
  expect(document.body.contains(positioner())).toBe(true)
  const panel = document.querySelector<HTMLElement>('.ui-popover-panel')!
  expect(panel.getAttribute('aria-label')).toBe('Test popover')
  expect(positioner().getAttribute('aria-label')).toBeNull()
})

test('resolved placement is exposed as data-side/data-align', async () => {
  const screen = await render(PopoverFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('content')).toBeVisible()

  expect(positioner().dataset.side).toBe('bottom')
  expect(positioner().dataset.align).toBe('center')
})

test('outside click dismisses; closeOnOutside=false leaves it open', async () => {
  const screen = await render(PopoverFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('content')).toBeVisible()

  await screen.getByTestId('outside').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')

  await screen.unmount()
  const pinned = await render(PopoverFixture, { props: { closeOnOutside: false } })
  await pinned.getByTestId('trigger').click()
  await expect.element(pinned.getByTestId('content')).toBeVisible()
  await pinned.getByTestId('outside').click()
  await expect.element(pinned.getByTestId('open-state')).toHaveTextContent('open')
})

test('Escape dismisses; closeOnEsc=false leaves it open', async () => {
  const screen = await render(PopoverFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('content')).toBeVisible()

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')

  await screen.unmount()
  const pinned = await render(PopoverFixture, { props: { closeOnEsc: false } })
  await pinned.getByTestId('trigger').click()
  await expect.element(pinned.getByTestId('content')).toBeVisible()
  await userEvent.keyboard('{Escape}')
  await expect.element(pinned.getByTestId('open-state')).toHaveTextContent('open')
})

test('forceMount keeps the panel mounted and hidden when closed', async () => {
  const screen = await render(PopoverFixture, { props: { forceMount: true } })

  expect(getComputedStyle(positioner()).display).toBe('none')

  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('content')).toBeVisible()

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  expect(document.querySelector('.ui-popover-positioner')).not.toBeNull()
  expect(getComputedStyle(positioner()).display).toBe('none')
})

test('openOnTriggerClick: click toggles open with no manual wiring, matching Menu', async () => {
  const screen = await render(PopoverFixture, { props: { openOnTriggerClick: true } })
  expect(document.querySelector('.ui-popover-positioner')).toBeNull()

  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('content')).toBeVisible()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('#trigger with setTriggerEl gets aria-expanded and aria-controls', async () => {
  const screen = await render(PopoverFixture, { props: { openOnTriggerClick: false } })
  const trigger = screen.getByTestId('trigger').element()
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  await screen.getByTestId('trigger').click()
  await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('true')
  const panelId = trigger.getAttribute('aria-controls')!
  expect(document.getElementById(panelId)?.classList.contains('ui-popover-panel')).toBe(true)
})

// Regression: a Popover mounted with `open` already true stayed hidden at (0,0).
test('a Popover mounted already open positions itself against its trigger', async () => {
  const screen = await render(PopoverOpenAtMountFixture)
  await screen.getByTestId('mount').click()
  await expect.element(screen.getByTestId('content')).toBeVisible()
  const triggerRect = (
    screen.getByTestId('trigger').element() as HTMLElement
  ).getBoundingClientRect()
  const rect = positioner().getBoundingClientRect()
  expect(rect.top).toBeGreaterThanOrEqual(triggerRect.bottom)
})

test('openPopover closed in the same tick still settles and never shows', async () => {
  const { defineComponent, h } = await import('vue')
  const { openPopover } = await import('../src/composables/usePopoverService')
  const PopoverHost = (await import('../src/components/PopoverHost/PopoverHost.vue')).default
  await render({ render: () => [h(PopoverHost), h('button', { id: 'early-anchor' }, 'Anchor')] })
  const handle = openPopover(defineComponent({ render: () => h('p', 'Body') }), {
    triggerEl: document.getElementById('early-anchor')!,
  })
  handle.close('early')
  await expect(handle.result).resolves.toBe('early')
  await vi.waitFor(() => expect(document.querySelector('.ui-popover-positioner')).toBeNull())
})

test('Escape that ends an IME composition does not close the popover', async () => {
  const screen = await render(PopoverFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('content')).toBeVisible()

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true }))
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(screen.getByTestId('open-state').element().textContent).toBe('open')

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('changing side or sideOffset while open repositions the panel', async () => {
  const side = shallowRef<'bottom' | 'top'>('bottom')
  const sideOffset = shallowRef(8)
  const anchor = shallowRef<HTMLElement | null>(null)
  await render(() => [
    h('button', { ref: anchor, id: 'reposition-trigger', style: 'margin: 200px' }, 'anchor'),
    h(
      Popover as never,
      {
        open: true,
        triggerEl: anchor.value,
        side: side.value,
        sideOffset: sideOffset.value,
      },
      () => h('p', 'content'),
    ),
  ])
  const trigger = document.getElementById('reposition-trigger')!
  await vi.waitFor(() => expect(positioner().style.visibility).toBe('visible'))
  expect(positioner().dataset.side).toBe('bottom')

  side.value = 'top'
  await vi.waitFor(() => expect(positioner().dataset.side).toBe('top'))
  const before = positioner().getBoundingClientRect().bottom
  expect(before).toBeLessThanOrEqual(trigger.getBoundingClientRect().top)

  sideOffset.value = 40
  await nextTick()
  await vi.waitFor(() =>
    expect(
      trigger.getBoundingClientRect().top - positioner().getBoundingClientRect().bottom,
    ).toBeCloseTo(40, 0),
  )
})
