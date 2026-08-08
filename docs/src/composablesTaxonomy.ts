// Sidebar grouping for the *standalone* composables — ones with no single
// owning component (see taxonomy.ts for the component-paired composables,
// e.g. useSlider/useResizable/useDock, which are documented on their own
// component's page instead of getting a separate entry here).
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
    items: ['useAsyncLoading', 'useColorScheme', 'useNumberFormat', 'useFieldControl'],
  },
]

export const allComposables = composableCategories.flatMap((c) => c.items)

export function composableCategoryOf(name: string): string | undefined {
  return composableCategories.find((c) => c.items.includes(name))?.key
}
