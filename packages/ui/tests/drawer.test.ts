// Real layout matters here (edge anchoring, overlay hit-testing), so load the CSS
import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import DrawerFixture from './fixtures/DrawerFixture.vue'

function activeTestId() {
  return document.activeElement?.getAttribute('data-testid') ?? document.activeElement?.className
}

test('position="right" renders a full-height panel anchored to the right edge, modal by default', async () => {
  const screen = await render(DrawerFixture, { props: { position: 'right' } })
  await screen.getByTestId('trigger-modal').click()
  await vi.waitFor(() => expect(document.querySelector('.ui-dialog--right')).not.toBeNull())
  await expect.element(page.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  expect(document.querySelector('.ui-dialog-overlay')).not.toBeNull()
  const panel = document.querySelector<HTMLElement>('.ui-dialog--right .ui-dialog-panel')!
  const rect = panel.getBoundingClientRect()
  expect(rect.height).toBeCloseTo(window.innerHeight, 0)
  expect(rect.right).toBeCloseTo(window.innerWidth, 0)
})

test('position="left" renders a full-height panel anchored to the left edge', async () => {
  const screen = await render(DrawerFixture, { props: { position: 'left' } })
  await screen.getByTestId('trigger-modal').click()
  await vi.waitFor(() => expect(document.querySelector('.ui-dialog--left')).not.toBeNull())
  const panel = document.querySelector<HTMLElement>('.ui-dialog--left .ui-dialog-panel')!
  const rect = panel.getBoundingClientRect()
  expect(rect.height).toBeCloseTo(window.innerHeight, 0)
  expect(rect.left).toBeCloseTo(0, 0)
})

test('modal=false renders no overlay, does not lock scroll, does not steal focus, and leaves the page clickable', async () => {
  const screen = await render(DrawerFixture)
  await screen.getByTestId('trigger-pinned').click()
  await expect.element(screen.getByTestId('pinned-state')).toHaveTextContent('open')

  expect(document.querySelector('.ui-dialog-overlay')).toBeNull()
  expect(document.body.style.overflow).toBe('')
  expect(activeTestId()).toBe('trigger-pinned')

  await screen.getByTestId('outside').click()
  await expect.element(screen.getByTestId('outside-clicks')).toHaveTextContent('1')

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('pinned-state')).toHaveTextContent('closed')
})

test('Drawer passes flush through, so a bottom drawer sits on the viewport edge', async () => {
  const { h } = await import('vue')
  const { default: Drawer } = await import('../src/components/Drawer/Drawer.vue')
  await render({
    render: () => [
      h(Drawer, { open: true, side: 'bottom', title: 'Flush', flush: true }),
      h(Drawer, { open: true, side: 'bottom', title: 'Floating', modal: false }),
    ],
  })
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-dialog-panel').length).toBe(2))
  const [flush, floating] = [...document.querySelectorAll<HTMLElement>('.ui-dialog-panel')]
  expect(flush!.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight, 0)
  expect(floating!.getBoundingClientRect().bottom).toBeLessThan(window.innerHeight - 8)
})

test('Drawer forwards the overlay as overlayEl', async () => {
  const { h, ref } = await import('vue')
  const { default: Drawer } = await import('../src/components/Drawer/Drawer.vue')
  const drawer = ref<InstanceType<typeof Drawer> | null>(null)
  await render({ render: () => h(Drawer, { ref: drawer, open: true, title: 'Overlay' }) })
  await vi.waitFor(() => expect(drawer.value?.overlayEl).toBeInstanceOf(HTMLElement))
  expect(drawer.value!.overlayEl).toBe(document.querySelector('.ui-dialog-overlay'))
})

test('a closing drawer lets taps through to the page under it while it slides away', async () => {
  // The exit is what this is about, so <Transition> runs for real.
  const screen = await render(DrawerFixture, {
    props: { position: 'left' },
    global: { stubs: { transition: false } },
  })
  await screen.getByTestId('trigger-modal').click()
  await vi.waitFor(() => expect(document.querySelector('.ui-dialog--left')).not.toBeNull())
  await new Promise((r) => setTimeout(r, 400))
  const outside = document.querySelector<HTMLElement>('[data-testid="outside"]')!
  const box = outside.getBoundingClientRect()
  const x = box.left + box.width / 2
  const y = box.top + box.height / 2
  // Open, the drawer is what's under that point.
  expect(document.elementFromPoint(x, y)?.closest('.ui-dialog')).not.toBeNull()
  await screen.getByTestId('done').click()
  await new Promise((r) => requestAnimationFrame(r))
  // Still on screen and leaving, yet the button under it is what a tap would hit.
  expect(document.querySelector('.ui-dialog-leave-active')).not.toBeNull()
  expect(document.elementFromPoint(x, y)).toBe(outside)
})
