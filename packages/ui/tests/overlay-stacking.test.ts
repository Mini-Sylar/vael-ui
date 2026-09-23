// Regression test for the cross-family stacking bug documented in gps-cmms-app's
// vael-ui-issues.md: a Dialog/Drawer/BottomSheet opened from inside an already-open Popover used
// to always render underneath it, since each overlay family had its own fixed z-index token with
// no relationship to actual open order. Popover and Dialog now both derive their z-index from the
// same shared layer stack (useLayerStack.ts), so whichever opened more recently wins regardless
// of family.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
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
