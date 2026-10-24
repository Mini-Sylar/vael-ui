// Run `pnpm build` before this test — it consumes the built output, not source.
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { createVaporApp, nextTick } from 'vue'
import LeakRoot from './fixtures/LeakRoot.vue'
import { trackResources } from '../../ui/tests/utils/resources'

// The Vapor build, mounted and unmounted with overlays open and highlights hovered: nothing may
// stay attached to the page afterwards.

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const pointer = (type: string) =>
  new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: 'mouse', button: 0 })

async function cycle(which: string) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(LeakRoot, { which: () => which })
  app.mount(host)
  await nextTick()
  await wait(60)
  // Dialog and CommandPalette teleport to <body>, leaving their host empty.
  const rendered = host.querySelector('*') ?? document.querySelector('[role="dialog"]')
  expect(rendered, `${which} rendered nothing`).not.toBeNull()
  const rows = document.querySelectorAll<HTMLElement>(
    '[role="option"], [role="menuitem"], [role="treeitem"], [role="tab"], [role="row"], [role="radio"], a, button',
  )
  for (const row of [...rows].slice(0, 4)) {
    row.dispatchEvent(pointer('pointerover'))
    await wait(20)
  }
  const field = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    'input:not([type=hidden]), textarea',
  )
  if (field) {
    field.focus()
    await Promise.race([userEvent.keyboard('ab'), wait(500)]).catch(() => {})
  }
  app.unmount()
  host.remove()
}

const cases = [
  'Button hold',
  'Input',
  'Textarea',
  'InputNumber',
  'OtpInput',
  'Select',
  'Combobox',
  'Menu',
  'MenuList',
  'Tree',
  'TreeSelect',
  'Tabs',
  'SelectButton',
  'Pagination',
  'Calendar',
  'DataTable',
  'Dialog',
  'Popover',
  'CommandPalette',
  'AnimatedNumber',
  'AnimatedText',
  'ConfigProvider',
  'Editable',
  'ColorPicker',
  'ScrollArea',
  'Sortable',
]

for (const which of cases) {
  test(`Vapor ${which} leaves nothing behind after unmount`, async () => {
    await cycle(which)
    await wait(300)
    const tracker = trackResources()
    try {
      await cycle(which)
      await cycle(which)
      await wait(900)
      expect(tracker.snapshot()).toEqual({ listeners: [], observers: [], frames: 0, intervals: 0 })
    } finally {
      tracker.restore()
    }
  })
}
