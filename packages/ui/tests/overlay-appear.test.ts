import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h } from 'vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import Drawer from '../src/components/Drawer/Drawer.vue'
import Popover from '../src/components/Popover/Popover.vue'
import Tooltip from '../src/components/Tooltip/Tooltip.vue'
import Select from '../src/components/Select/Select.vue'
import Menu from '../src/components/Menu/Menu.vue'
import SpeedDial from '../src/components/SpeedDial/SpeedDial.vue'
import DialogHost from '../src/components/DialogHost/DialogHost.vue'
import { openDialog } from '../src/composables/useDialogService'

// Real transitions: the test renderer stubs them by default.
const options = { global: { stubs: { transition: false, 'transition-group': false } } }
// Animating in, whoever plays it: the component's CSS (Vue's enter class) or the motion engine
// (running animations under it, the engine's cold-start hold included).
const entering = (el: Element | null | undefined) =>
  !!el && (/-enter-active/.test(el.className) || el.getAnimations({ subtree: true }).length > 0)
// Engine-driven (Dialog and what builds on it): the panel itself must really be moving, not just
// carry a class (and not merely the focused close button fading its own opacity).
const panelMoving = () =>
  (document.querySelector('.ui-dialog-panel')?.getAnimations().length ?? 0) > 0
const engineDriven = new Set(['Dialog', 'Drawer'])
const trigger = ({ setTriggerEl }: { setTriggerEl: (el: unknown) => void }) =>
  h('button', { ref: setTriggerEl }, 'Trigger')

const cases: [string, () => unknown, string][] = [
  ['Dialog', () => h(Dialog as never, { open: true, title: 'Dialog' }), '.ui-dialog'],
  ['Drawer', () => h(Drawer, { open: true, title: 'Drawer' }), '.ui-dialog'],
  [
    'Popover',
    () => h(Popover as never, { open: true }, { trigger, default: () => h('p', 'Body') }),
    '.ui-popover-positioner',
  ],
  [
    'Tooltip',
    () => h(Tooltip, { open: true }, { trigger, default: () => 'Tip' }),
    '.ui-tooltip-positioner',
  ],
  [
    'Select',
    () => h(Select as never, { open: true, items: [{ label: 'One', value: 1 }] }),
    '.ui-select-positioner',
  ],
  [
    'Menu',
    () => h(Menu as never, { open: true, items: [{ label: 'One' }] }, { trigger }),
    '.ui-menu-positioner',
  ],
  [
    'SpeedDial',
    () => h(SpeedDial as never, { open: true, items: [{ label: 'One', value: 'one' }] }),
    '.ui-speed-dial-action',
  ],
]

for (const [name, tree, selector] of cases) {
  test(`${name} mounted open plays its enter transition`, async () => {
    await render(defineComponent({ render: tree as never }), options)
    // The engine may still be loading on a cold start: give it a moment, then the panel moves.
    if (engineDriven.has(name)) await vi.waitFor(() => expect(panelMoving()).toBe(true))
    else expect(entering(document.querySelector(selector))).toBe(true)
  })
}

test('openDialog plays the enter transition', async () => {
  await render(defineComponent({ render: () => h(DialogHost) }), options)
  const handle = openDialog(defineComponent({ render: () => h('p', 'Body') }), { title: 'Code' })
  await vi.waitFor(() => expect(panelMoving()).toBe(true))
  handle.close()
  await handle.result
})

test('a toast sent before its Toaster mounts plays its enter transition', async () => {
  const { toast } = await import('../src/composables/useToast')
  const Toaster = (await import('../src/components/Toaster/Toaster.vue')).default
  toast.dismiss()
  toast('Early')
  await render(defineComponent({ render: () => h(Toaster) }), options)
  expect(document.querySelector('.ui-toast')?.className).toMatch(/ui-toast-enter-active/)
  toast.dismiss()
})
