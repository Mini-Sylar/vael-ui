import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, onMounted, shallowRef } from 'vue'
import type { Component } from 'vue'
import { trackResources } from './utils/resources'
import AccordionFixture from './fixtures/AccordionFixture.vue'
import BottomSheetFixture from './fixtures/BottomSheetFixture.vue'
import ButtonFixture from './fixtures/ButtonFixture.vue'
import CalendarFixture from './fixtures/CalendarFixture.vue'
import CascadeSelectFixture from './fixtures/CascadeSelectFixture.vue'
import CollapsibleFixture from './fixtures/CollapsibleFixture.vue'
import ComboboxFixture from './fixtures/ComboboxFixture.vue'
import ContextMenuFixture from './fixtures/ContextMenuFixture.vue'
import DataTableFixture from './fixtures/DataTableFixture.vue'
import DatePickerFixture from './fixtures/DatePickerFixture.vue'
import DialFixture from './fixtures/DialFixture.vue'
import DialogFixture from './fixtures/DialogFixture.vue'
import DockFixture from './fixtures/DockFixture.vue'
import DrawerFixture from './fixtures/DrawerFixture.vue'
import FileUploadFixture from './fixtures/FileUploadFixture.vue'
import InputFixture from './fixtures/InputFixture.vue'
import InputNumberFixture from './fixtures/InputNumberFixture.vue'
import KnobFixture from './fixtures/KnobFixture.vue'
import MenuFixture from './fixtures/MenuFixture.vue'
import MenuListFixture from './fixtures/MenuListFixture.vue'
import MenuSubmenuFixture from './fixtures/MenuSubmenuFixture.vue'
import MessageFixture from './fixtures/MessageFixture.vue'
import OtpInputFixture from './fixtures/OtpInputFixture.vue'
import PaginationFixture from './fixtures/PaginationFixture.vue'
import PasswordInputFixture from './fixtures/PasswordInputFixture.vue'
import PopoverFixture from './fixtures/PopoverFixture.vue'
import PullToRefreshFixture from './fixtures/PullToRefreshFixture.vue'
import ResizableFixture from './fixtures/ResizableFixture.vue'
import SelectButtonFixture from './fixtures/SelectButtonFixture.vue'
import SelectFixture from './fixtures/SelectFixture.vue'
import SliderFixture from './fixtures/SliderFixture.vue'
import SortableFixture from './fixtures/SortableFixture.vue'
import SpeedDialFixture from './fixtures/SpeedDialFixture.vue'
import SplitButtonFixture from './fixtures/SplitButtonFixture.vue'
import SwipeToRevealFixture from './fixtures/SwipeToRevealFixture.vue'
import SwitchFixture from './fixtures/SwitchFixture.vue'
import TabsFixture from './fixtures/TabsFixture.vue'
import TextareaFixture from './fixtures/TextareaFixture.vue'
import ToasterFixture from './fixtures/ToasterFixture.vue'
import ToolbarFixture from './fixtures/ToolbarFixture.vue'
import TooltipFixture from './fixtures/TooltipFixture.vue'
import TourFixture from './fixtures/TourFixture.vue'
import TreeFixture from './fixtures/TreeFixture.vue'
import TreeSelectFixture from './fixtures/TreeSelectFixture.vue'
import AnimatedNumber from '../src/components/AnimatedNumber/AnimatedNumber.vue'
import AnimatedText from '../src/components/AnimatedText/AnimatedText.vue'
import Button from '../src/components/Button/Button.vue'
import CommandPalette from '../src/components/CommandPalette/CommandPalette.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Input from '../src/components/Input/Input.vue'
import Textarea from '../src/components/Textarea/Textarea.vue'
import ColorPicker from '../src/components/ColorPicker/ColorPicker.vue'
import Editable from '../src/components/Editable/Editable.vue'
import ScrollArea from '../src/components/ScrollArea/ScrollArea.vue'

// Each component is mounted once to install any page-wide singletons (focus-visible tracking,
// the layer stack), then mounted, used and unmounted again under the tracker. Whatever is still
// attached to the page afterwards is a leak.

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const global = { stubs: { transition: false, 'transition-group': false } }

// Use whatever the component offers: open triggers, hover rows and options, focus fields, type.
// Plain DOM events, not Playwright's actions, which wait on elements an overlay covers.
const pointer = (type: string) =>
  new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: 'mouse', button: 0 })
async function settle(fn: () => unknown) {
  try {
    await Promise.race([fn(), wait(500)])
  } catch {
    // An element that went away mid-step is fine; the point is what is left afterwards.
  }
}
async function exercise(root: HTMLElement) {
  const trigger = root.querySelector<HTMLElement>(
    '[aria-haspopup], [role="combobox"], button[data-testid], button',
  )
  if (trigger) {
    trigger.dispatchEvent(pointer('pointerdown'))
    trigger.dispatchEvent(pointer('pointerup'))
    trigger.click()
  }
  await nextTick()
  await wait(50)
  const rows = document.querySelectorAll<HTMLElement>(
    '[role="option"], [role="menuitem"], [role="treeitem"], [role="tab"], [role="row"], [role="radio"], a, button',
  )
  for (const row of [...rows].slice(0, 4)) {
    row.dispatchEvent(pointer('pointerover'))
    row.dispatchEvent(pointer('pointermove'))
    await wait(20)
  }
  const field = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    'input:not([type=hidden]), textarea',
  )
  if (field) {
    field.focus()
    await settle(() => userEvent.keyboard('ab'))
  }
  await settle(() => userEvent.keyboard('{Escape}'))
}

interface Case {
  name: string
  mount: () => Component
}
const fixture = (component: Component) => () => component
const cases: Case[] = [
  ...Object.entries({
    Accordion: AccordionFixture,
    BottomSheet: BottomSheetFixture,
    Calendar: CalendarFixture,
    CascadeSelect: CascadeSelectFixture,
    Collapsible: CollapsibleFixture,
    Combobox: ComboboxFixture,
    ContextMenu: ContextMenuFixture,
    DataTable: DataTableFixture,
    DatePicker: DatePickerFixture,
    Dial: DialFixture,
    Dialog: DialogFixture,
    Dock: DockFixture,
    Drawer: DrawerFixture,
    FileUpload: FileUploadFixture,
    Input: InputFixture,
    InputNumber: InputNumberFixture,
    Knob: KnobFixture,
    Menu: MenuFixture,
    MenuList: MenuListFixture,
    MenuSubmenu: MenuSubmenuFixture,
    Message: MessageFixture,
    OtpInput: OtpInputFixture,
    Pagination: PaginationFixture,
    PasswordInput: PasswordInputFixture,
    Popover: PopoverFixture,
    PullToRefresh: PullToRefreshFixture,
    Resizable: ResizableFixture,
    SelectButton: SelectButtonFixture,
    Select: SelectFixture,
    Slider: SliderFixture,
    Sortable: SortableFixture,
    SpeedDial: SpeedDialFixture,
    SplitButton: SplitButtonFixture,
    SwipeToReveal: SwipeToRevealFixture,
    Switch: SwitchFixture,
    Tabs: TabsFixture,
    Textarea: TextareaFixture,
    Toaster: ToasterFixture,
    Toolbar: ToolbarFixture,
    Tooltip: TooltipFixture,
    Tour: TourFixture,
    Tree: TreeFixture,
    TreeSelect: TreeSelectFixture,
  }).map(([name, component]) => ({ name, mount: fixture(component) })),
  {
    name: 'AnimatedNumber and AnimatedText changing',
    mount: () => ({
      setup() {
        const n = shallowRef(1)
        const timer = setTimeout(() => (n.value = 1234), 20)
        void timer
        return () => [
          h(AnimatedNumber, { value: n.value }),
          h(AnimatedText, { value: `v${n.value}` }),
        ]
      },
    }),
  },
  {
    name: 'Button',
    mount: () => ({
      render: () =>
        h(ButtonFixture, { task: () => new Promise((resolve) => setTimeout(resolve, 50)) }),
    }),
  },
  {
    name: 'Button hold',
    mount: () => ({ render: () => h(Button, { hold: 200 }, () => 'Hold') }),
  },
  {
    name: 'Input animated and #display',
    mount: () => ({
      render: () => [
        h(Input, { animated: true, placeholder: 'Search', 'aria-label': 'a' }),
        h(Input, { 'aria-label': 'b' }, { display: ({ value }: { value: string }) => value }),
      ],
    }),
  },
  {
    name: 'Textarea #display',
    mount: () => ({
      render: () =>
        h(Textarea, { 'aria-label': 't' }, { display: ({ value }: { value: string }) => value }),
    }),
  },
  {
    name: 'CommandPalette open',
    mount: () => ({
      render: () =>
        h(CommandPalette as never, {
          open: true,
          items: [
            { id: 1, label: 'One' },
            { id: 2, label: 'Two' },
          ],
        }),
    }),
  },
  {
    name: 'ConfigProvider spring motion with indicators',
    mount: () => ({
      render: () =>
        h(
          ConfigProvider,
          { motion: { spring: { damping: 0.6, response: 0.3 } }, haptics: true },
          () => h(MenuListFixture),
        ),
    }),
  },
  { name: 'ColorPicker', mount: () => ({ render: () => h(ColorPicker, { 'aria-label': 'c' }) }) },
  {
    name: 'Editable',
    mount: () => ({ render: () => h(Editable, { modelValue: 'Name', 'aria-label': 'e' }) }),
  },
  {
    name: 'ScrollArea',
    mount: () => ({
      render: () =>
        h(ScrollArea, { style: 'height: 60px' }, () => h('div', { style: 'height: 400px' })),
    }),
  },
]

for (const { name, mount } of cases) {
  test(`${name} leaves nothing behind after unmount`, async () => {
    const warm = await render(mount(), { global })
    await exercise(warm.container as HTMLElement)
    warm.unmount()
    await wait(400)

    const tracker = trackResources()
    try {
      for (let round = 0; round < 2; round++) {
        const screen = await render(mount(), { global })
        await exercise(screen.container as HTMLElement)
        screen.unmount()
      }
      // Exit animations, settling springs and closing delays finish first.
      await wait(900)
      const left = tracker.snapshot()
      expect(left).toEqual({ listeners: [], observers: [], frames: 0, intervals: 0 })
    } finally {
      tracker.restore()
    }
  })
}

test('the tracker catches a component that leaks each kind of resource', async () => {
  const Leaky = {
    setup() {
      onMounted(() => {
        window.addEventListener('resize', () => {})
        new ResizeObserver(() => {}).observe(document.body)
        const loop = () => requestAnimationFrame(loop)
        loop()
        setInterval(() => {}, 1000)
      })
      return () => h('div')
    },
  }
  const tracker = trackResources()
  try {
    const screen = await render(Leaky)
    screen.unmount()
    await wait(100)
    const left = tracker.snapshot()
    expect(left.listeners).toEqual(['window:resize'])
    expect(left.observers).toEqual(['ResizeObserver(1)'])
    expect(left.frames).toBe(1)
    expect(left.intervals).toBe(1)
  } finally {
    tracker.restore()
  }
})
