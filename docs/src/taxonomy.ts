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
    components: ['SwipeToReveal', 'PullToRefresh', 'Dock'],
  },
]

export const allComponents = categories.flatMap((c) => c.components)

export function categoryOf(component: string): string | undefined {
  return categories.find((c) => c.components.includes(component))?.key
}

// Component name -> the ISO date it shipped. Drives the sidebar's "new" dot (see
// Sidebar.vue): shown until the component's page is visited, or NEW_BADGE_DAYS after
// this date, whichever comes first. Add an entry here when a component ships; there's
// no cleanup step — stale entries just stop rendering once they age out.
export const NEW_COMPONENTS: Record<string, string> = {
  ScrollArea: '2026-08-03',
  AvatarGroup: '2026-08-05',
  Breadcrumb: '2026-08-05',
  Stepper: '2026-08-06',
  CommandPalette: '2026-08-07',
  Tour: '2026-08-08',
}

export const NEW_BADGE_DAYS = 14
