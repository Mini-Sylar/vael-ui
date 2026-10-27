// Hand-maintained sidebar grouping. Component APIs are generated; this
// taste-driven categorization isn't, so it's a plain list to extend by hand
// whenever a new component ships. `key` looks up the display label in
// locales/*.json (`taxonomy.<key>`); `name` is the English fallback.
export interface ComponentCategory {
  key: string
  name: string
  components: string[]
}

export const categories: ComponentCategory[] = [
  // ConfigProvider wraps every app that uses vael-ui at all. It's the
  // first real component a consumer touches, so it leads the sidebar
  // instead of hiding alphabetically at the bottom of "Utilities".
  { key: 'setup', name: 'Setup', components: ['ConfigProvider'] },
  {
    key: 'actions',
    name: 'Actions',
    components: [
      'Button',
      'ButtonGroup',
      'SplitButton',
      'Toolbar',
      'SpeedDial',
      'Dial',
      'SelectButton',
    ],
  },
  {
    key: 'formsAndInputs',
    name: 'Forms & Inputs',
    components: [
      'Input',
      'Textarea',
      'InputNumber',
      'OtpInput',
      'PasswordInput',
      'Editable',
      'ColorPicker',
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
      'Rating',
    ],
  },
  {
    key: 'selection',
    name: 'Selection',
    components: ['Select', 'Combobox', 'CascadeSelect', 'Tree', 'TreeSelect'],
  },
  // DialogHost and TooltipHost are zero/low-config singletons you mount
  // once and never touch again. See the "Global setup" guide instead of
  // giving each its own sidebar entry and near-empty page.
  {
    key: 'overlays',
    name: 'Overlays',
    components: [
      'Dialog',
      'Drawer',
      'Popover',
      'Tooltip',
      'BottomSheet',
      'ContextMenu',
      'CommandPalette',
      'Tour',
    ],
  },
  {
    key: 'navigationAndMenus',
    name: 'Navigation & Menus',
    components: ['Menu', 'MenuList', 'Tabs', 'Stepper', 'Breadcrumb'],
  },
  {
    key: 'feedback',
    name: 'Feedback',
    components: ['Toaster', 'Message', 'Progress', 'Loader', 'Skeleton'],
  },
  // Column and AccordionItem are documented on their parent's page instead
  // of getting their own sidebar entry, same reasoning as DialogHost and
  // TooltipHost above: neither renders (or means anything) on its own.
  {
    key: 'dataDisplay',
    name: 'Data Display',
    components: [
      'DataTable',
      'Pagination',
      'Card',
      'Avatar',
      'AvatarGroup',
      'Badge',
      'Tag',
      'Chip',
      'Kbd',
      'AnimatedNumber',
      'AnimatedText',
      'Timeline',
    ],
  },
  {
    key: 'layoutAndStructure',
    name: 'Layout & Structure',
    components: ['Accordion', 'Collapsible', 'Separator', 'Resizable', 'ScrollArea'],
  },
  {
    key: 'gestures',
    name: 'Gestures',
    components: ['SwipeToReveal', 'PullToRefresh', 'Dock', 'Sortable'],
  },
]

export const allComponents = categories.flatMap((c) => c.components)

export function categoryOf(component: string): string | undefined {
  return categories.find((c) => c.components.includes(component))?.key
}

// Component name -> the ISO date it shipped, or was improved enough to point out again. Drives the sidebar's "new" dot (see
// Sidebar.vue): shown until the component's page is visited, or NEW_BADGE_DAYS after
// this date, whichever comes first. Add an entry here when a component ships; there's
// no cleanup step — stale entries just stop rendering once they age out.
export const NEW_COMPONENTS: Record<string, string> = {
  Accordion: '2026-10-21',
  AnimatedNumber: '2026-10-21',
  AnimatedText: '2026-10-21',
  AvatarGroup: '2026-10-21',
  BottomSheet: '2026-10-21',
  Breadcrumb: '2026-10-21',
  Button: '2026-10-21',
  Calendar: '2026-10-21',
  CascadeSelect: '2026-10-21',
  Checkbox: '2026-10-21',
  Collapsible: '2026-10-21',
  ColorPicker: '2026-10-21',
  Combobox: '2026-10-21',
  CommandPalette: '2026-10-21',
  ConfigProvider: '2026-10-21',
  ContextMenu: '2026-10-21',
  DataTable: '2026-10-21',
  DatePicker: '2026-10-21',
  Dial: '2026-10-21',
  Dialog: '2026-10-21',
  Dock: '2026-10-21',
  Drawer: '2026-10-21',
  Editable: '2026-10-21',
  FileUpload: '2026-10-21',
  Input: '2026-10-21',
  InputNumber: '2026-10-21',
  Knob: '2026-10-21',
  Loader: '2026-10-21',
  Menu: '2026-10-21',
  MenuList: '2026-10-21',
  Message: '2026-10-21',
  OtpInput: '2026-10-21',
  Pagination: '2026-10-21',
  PasswordInput: '2026-10-21',
  Popover: '2026-10-21',
  Progress: '2026-10-21',
  PullToRefresh: '2026-10-21',
  Radio: '2026-10-21',
  Rating: '2026-10-21',
  Resizable: '2026-10-21',
  ScrollArea: '2026-10-21',
  Select: '2026-10-21',
  SelectButton: '2026-10-21',
  Skeleton: '2026-10-21',
  Slider: '2026-10-21',
  Sortable: '2026-10-21',
  SpeedDial: '2026-10-21',
  SplitButton: '2026-10-21',
  Stepper: '2026-10-21',
  SwipeToReveal: '2026-10-21',
  Switch: '2026-10-21',
  Tabs: '2026-10-21',
  Textarea: '2026-10-21',
  Timeline: '2026-10-21',
  Toaster: '2026-10-21',
  Toolbar: '2026-10-21',
  Tooltip: '2026-10-21',
  Tour: '2026-10-21',
  Tree: '2026-10-21',
  TreeSelect: '2026-10-21',
}

export const NEW_BADGE_DAYS = 14
