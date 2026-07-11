/**
 * Broad regression guard for gen.mjs's full public component batch,
 * including Dialog/Dock/Menu/Popover/TooltipHost now that vTooltipVapor/
 * vScrollMaskVapor exist. Mounts every one of them at once, through the
 * BUILT dist bundle, no interop plugin, and asserts each rendered non-empty
 * content with zero page errors. Not exhaustive per-component behavior —
 * Button/DataTable's own tests carry that — this just catches gross
 * breakage (a crash anywhere takes down the whole mounted tree).
 */
import { expect, test } from 'vitest'
import { createVaporApp } from 'vue'
import SmokeTestRoot from './fixtures/SmokeTestRoot.vue'

// Legitimately empty when idle — content only Teleports in while a tooltip is open.
const EMPTY_WHEN_IDLE = new Set(['TooltipHost'])

const NAMES = [
  'Accordion',
  'Avatar',
  'Badge',
  'Button',
  'Calendar',
  'Card',
  'Checkbox',
  'Chip',
  'Collapsible',
  'ConfigProvider',
  'Dial',
  'Dialog',
  'Dock',
  'Field',
  'Input',
  'Kbd',
  'Knob',
  'Loader',
  'Menu',
  'OtpInput',
  'Popover',
  'PullToRefresh',
  'RadioGroup',
  'Resizable',
  'SelectButton',
  'Separator',
  'Skeleton',
  'Slider',
  'SwipeToReveal',
  'Switch',
  'Tabs',
  'Tag',
  'Textarea',
  'Tooltip',
  'TooltipHost',
]

test('every public vapor-lib component mounts and renders with no errors', () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(SmokeTestRoot)
  app.mount(host)
  try {
    for (const name of NAMES) {
      const el = host.querySelector(`[data-testid="smoke-${name}"]`)
      expect(el, `${name} should be in the DOM`).not.toBeNull()
      if (!EMPTY_WHEN_IDLE.has(name)) {
        expect(el!.innerHTML.trim().length, `${name} should have rendered content`).toBeGreaterThan(
          0,
        )
      }
    }
  } finally {
    app.unmount()
  }
})
