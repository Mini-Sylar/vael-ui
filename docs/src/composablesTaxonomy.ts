// Sidebar grouping for the *standalone* composables — ones with no single
// owning component. Component-paired composables (useSlider, useResizable,
// useDock...) live in pairedComposables.ts and render on their component's
// page instead of getting a separate entry here.
export interface ComposableCategory {
  key: string
  name: string
  items: string[]
}

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
      'useSpringValue',
      'useTween',
      'useScrollProgress',
      'settled',
      'useTabIndicator',
      'useHoverIndicator',
      'springEasing',
    ],
  },
  {
    key: 'dragAndDrop',
    name: 'Drag & Drop',
    items: ['useSortable', 'useSortableGroup', 'moveTreeNode', 'useFileDrop'],
  },
]

export const allComposables = composableCategories.flatMap((c) => c.items)

// Composable name -> the date it shipped or was improved; the sidebar shows a "new" dot until the
// page is visited, like NEW_COMPONENTS.
export const NEW_COMPOSABLES: Record<string, string> = {
  useColorScheme: '2026-10-21',
  useFileDrop: '2026-10-21',
  useFloatingPosition: '2026-10-21',
  useHaptic: '2026-10-21',
  useHoverIndicator: '2026-10-21',
  useNumberFormat: '2026-10-21',
  useScrollProgress: '2026-10-25',
  settled: '2026-10-25',
  useSpringValue: '2026-10-21',
  useTween: '2026-10-26',
  useTabIndicator: '2026-10-21',
  springEasing: '2026-10-21',
}

export function composableCategoryOf(name: string): string | undefined {
  return composableCategories.find((c) => c.items.includes(name))?.key
}
