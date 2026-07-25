// Hand-maintained sidebar grouping. Component APIs are generated; this
// taste-driven categorization isn't, so it's a plain list to extend by hand
// whenever a new component ships.
export interface ComponentCategory {
  name: string
  components: string[]
}

export const categories: ComponentCategory[] = [
  // ConfigProvider wraps every app that uses vael-ui at all. It's the
  // first real component a consumer touches, so it leads the sidebar
  // instead of hiding alphabetically at the bottom of "Utilities".
  { name: 'Setup', components: ['ConfigProvider'] },
  {
    name: 'Actions',
    components: ['Button', 'SplitButton', 'Toolbar', 'SpeedDial', 'Dial', 'SelectButton'],
  },
  {
    name: 'Forms & Inputs',
    components: [
      'Input',
      'Textarea',
      'InputNumber',
      'OtpInput',
      'Checkbox',
      'Radio',
      'RadioGroup',
      'Switch',
      'Slider',
      'Knob',
      'Field',
      'DatePicker',
      'Calendar',
      'FileUpload',
    ],
  },
  { name: 'Selection', components: ['Select', 'Combobox', 'CascadeSelect', 'Tree', 'TreeSelect'] },
  // DialogHost and TooltipHost are zero/low-config singletons you mount
  // once and never touch again. See the "Global setup" guide instead of
  // giving each its own sidebar entry and near-empty page.
  {
    name: 'Overlays',
    components: ['Dialog', 'Popover', 'Tooltip', 'BottomSheet', 'ContextMenu'],
  },
  { name: 'Navigation & Menus', components: ['Menu', 'MenuList', 'Tabs'] },
  { name: 'Feedback', components: ['Toaster', 'Message', 'Progress', 'Loader', 'Skeleton'] },
  // Column and AccordionItem are documented on their parent's page instead
  // of getting their own sidebar entry, same reasoning as DialogHost and
  // TooltipHost above: neither renders (or means anything) on its own.
  {
    name: 'Data Display',
    components: ['DataTable', 'Pagination', 'Card', 'Avatar', 'Badge', 'Tag', 'Chip', 'Kbd'],
  },
  {
    name: 'Layout & Structure',
    components: ['Accordion', 'Collapsible', 'Separator', 'Resizable'],
  },
  { name: 'Gestures', components: ['SwipeToReveal', 'PullToRefresh', 'Dock'] },
]

export const allComponents = categories.flatMap((c) => c.components)

export function categoryOf(component: string): string | undefined {
  return categories.find((c) => c.components.includes(component))?.name
}
