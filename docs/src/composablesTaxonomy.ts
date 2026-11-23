// Sidebar grouping for the composables. Most stand alone. The ones that each drive a component
// (useSlider, useResizable, useDock...) are written up in pairedComposables.ts, shown on that
// component's page too, and listed here under "Used with a component" so each has its own page.
export interface ComposableCategory {
  key: string
  name: string
  items: string[]
}

/** The composables written up in pairedComposables.ts, and the component each one drives. `pnpm gen` checks this stays in step. */
export const PAIRED_COMPOSABLES: Record<string, string> = {
  useTabs: 'Tabs',
  useMenu: 'Menu',
  useListbox: 'Select',
  useToolbar: 'Toolbar',
  useCollapse: 'Collapsible',
  useTooltip: 'Tooltip',
  usePopover: 'Popover',
  useDialog: 'Dialog',
  useDataTableContext: 'DataTable',
  useSlider: 'Slider',
  useKnob: 'Knob',
  useDial: 'Dial',
  useResizable: 'Resizable',
  useDock: 'Dock',
  dockItemSizes: 'Dock',
  useSwipeReveal: 'SwipeToReveal',
  resolveSwipeCommit: 'SwipeToReveal',
  useSheetDrag: 'BottomSheet',
  usePullToRefresh: 'PullToRefresh',
}

/** Written up on their component's page only: an engine the host runs on, not something to build with. */
export const PAIRED_WITHOUT_PAGE: string[] = ['useTooltipCore']

export const composableCategories: ComposableCategory[] = [
  {
    key: 'overlaysAndConfirmation',
    name: 'Overlays & Confirmation',
    items: ['confirmAction', 'useDialogService', 'usePopoverService', 'useToast', 'useTour'],
  },
  {
    key: 'positioningAndData',
    name: 'Positioning & Data',
    items: ['useFloatingPosition', 'useVirtualizer'],
  },
  {
    key: 'utilities',
    name: 'Utilities',
    items: [
      'useAsyncLoading',
      'useColorScheme',
      'useHaptic',
      'preventFocusZoom',
      'useNumberFormat',
      'useFieldControl',
      'useScrollLock',
    ],
  },
  {
    key: 'motion',
    name: 'Motion',
    items: [
      'useAnimate',
      'useSpringValue',
      'useTween',
      'useScrollProgress',
      'useScrollLength',
      'settled',
      'useTabIndicator',
      'useHoverIndicator',
      'springEasing',
      'mapRange',
    ],
  },
  {
    key: 'dragAndDrop',
    name: 'Drag & Drop',
    items: [
      'useDrag',
      'useWheel',
      'usePanZoom',
      'useDragSelect',
      'useSortable',
      'useSortableGroup',
      'moveTreeNode',
      'useFileDrop',
    ],
  },
  { key: 'withComponents', name: 'Used with a component', items: Object.keys(PAIRED_COMPOSABLES) },
]

export const allComposables = composableCategories.flatMap((c) => c.items)

// Composable name -> the date it shipped or was improved; the sidebar shows a "new" dot until the
// page is visited, like NEW_COMPONENTS.
export const NEW_COMPOSABLES: Record<string, string> = {
  useAnimate: '2026-11-05',
  useDrag: '2026-11-18',
  useResizable: '2026-11-23',
  usePanZoom: '2026-11-18',
  useDragSelect: '2026-11-19',
  useWheel: '2026-11-18',
  useColorScheme: '2026-10-21',
  useFileDrop: '2026-10-21',
  useFloatingPosition: '2026-10-21',
  useHaptic: '2026-10-21',
  useHoverIndicator: '2026-10-21',
  useNumberFormat: '2026-10-21',
  useScrollProgress: '2026-10-25',
  useScrollLength: '2026-11-05',
  settled: '2026-10-25',
  useSpringValue: '2026-10-21',
  useTween: '2026-10-26',
  useTabIndicator: '2026-10-21',
  springEasing: '2026-10-21',
  mapRange: '2026-11-18',
}

export function composableCategoryOf(name: string): string | undefined {
  return composableCategories.find((c) => c.items.includes(name))?.key
}

/** The component a composable drives, when it is one of the paired ones. */
export function pairedComponentOf(name: string): string | undefined {
  return PAIRED_COMPOSABLES[name]
}
