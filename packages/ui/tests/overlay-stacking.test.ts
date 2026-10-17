// Regression test for the cross-family stacking bug documented in gps-cmms-app's
// vael-ui-issues.md: a Dialog/Drawer/BottomSheet opened from inside an already-open Popover used
// to always render underneath it, since each overlay family had its own fixed z-index token with
// no relationship to actual open order. Popover and Dialog now both derive their z-index from the
// same shared layer stack (useLayerStack.ts), so whichever opened more recently wins regardless
// of family.
import '../src/style.css'
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import OverlayStackingFixture from './fixtures/OverlayStackingFixture.vue'

function zIndexOf(selector: string): number {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) throw new Error(`${selector} not in DOM`)
  return Number(getComputedStyle(el).zIndex)
}

test('a Dialog opened from inside an already-open Popover renders above it', async () => {
  const screen = await render(OverlayStackingFixture)

  await screen.getByTestId('popover-trigger').click()
  await expect.element(screen.getByTestId('popover-content')).toBeVisible()

  await screen.getByTestId('dialog-trigger').click()
  await expect.element(screen.getByTestId('dialog-content')).toBeVisible()

  expect(zIndexOf('.ui-dialog')).toBeGreaterThan(zIndexOf('.ui-popover-positioner'))
})

test('a Dialog keeps its stacking order while its exit animation plays', async () => {
  const first = shallowRef(false)
  const second = shallowRef(false)
  // `second` mounts first, so at an equal z-index it would paint under `first`.
  await render(
    () => [
      h(Dialog, { open: second.value, 'aria-label': 'Second' }, () => h('p', 'Second')),
      h(Dialog, { open: first.value, 'aria-label': 'First' }, () => h('p', 'First')),
    ],
    { global: { stubs: { transition: false, 'transition-group': false } } },
  )
  first.value = true
  await expect.element(page.getByRole('dialog', { name: 'First' })).toBeVisible()
  second.value = true
  await expect.element(page.getByRole('dialog', { name: 'Second' })).toBeVisible()

  const root = (name: string) =>
    document.querySelector(`[aria-label="${name}"]`)!.closest<HTMLElement>('.ui-dialog')!
  const z = (name: string) => Number.parseFloat(getComputedStyle(root(name)).zIndex)
  const secondRoot = root('Second')

  second.value = false
  await nextTick()
  await nextTick()
  // Still leaving, and still above the dialog underneath it.
  expect(secondRoot.isConnected).toBe(true)
  expect(Number.parseFloat(getComputedStyle(secondRoot).zIndex)).toBeGreaterThan(z('First'))
})
