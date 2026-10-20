// Dev-only stress data for the search palette (break-ui). Chosen by `?data=` in the URL on the
// dev server: worst, empty, one, huge. Never imported into a production build's data path:
// SiteSearch only calls this when import.meta.env.DEV is true.
import { PhPlayCircle, PhSlidersHorizontal, PhLightning, PhPuzzlePiece } from '@phosphor-icons/vue'
import type { PaletteEntry } from './entries'

export type DataMode = 'demo' | 'worst' | 'empty' | 'one' | 'huge'
export const DATA_MODES: DataMode[] = ['demo', 'worst', 'empty', 'one', 'huge']

const to = (name: string, hash = '') => ({ name: 'component', params: { name }, hash })

// Shaped like the real API, at the plausible far end of each field.
const WORST: PaletteEntry[] = [
  {
    id: 'worst:page',
    kind: 'page',
    label: 'DateRangePickerPresets',
    to: to('DateRangePickerPresets'),
    description:
      'A panel of preset ranges (today, last 7 days, this quarter, fiscal year to date) beside a two-month calendar, with keyboard support, locale-aware week starts and a compact layout for narrow sidebars where the calendar stacks under the presets.',
    text: 'date range presets',
    group: 'Forms & Inputs',
    scope: 'DateRangePickerPresets',
    copy: "import { DateRangePickerPresets } from 'vael-ui'",
    copyKind: 'import',
  },
  {
    id: 'worst:prop-long',
    kind: 'props',
    label: 'restoreFocusToTriggerOnClose',
    parent: 'BreadcrumbSeparator',
    scope: 'DateRangePickerPresets',
    to: to('Dialog', '#props-open'),
    type: '(item: TreeNode<T>, context: { depth: number; parent: TreeNode<T> | null; expanded: boolean }) => boolean | Promise<boolean>',
    defaultValue: "() => ({ day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit' })",
    required: true,
    description:
      'See https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView#scrolllogicalposition for the alignment values, and <Dialog v-model:open="open"> for where it applies.',
    text: 'restore focus trigger close',
    group: 'Props',
    copy: 'restore-focus-to-trigger-on-close',
    copyKind: 'usage',
    icon: PhSlidersHorizontal,
  },
  {
    id: 'worst:prop-ui',
    kind: 'props',
    label: 'ui',
    parent: 'DataTable',
    scope: 'DateRangePickerPresets',
    to: to('DataTable', '#props-ui'),
    type: 'Partial<{ root: UiPartValue; toolbar: UiPartValue; table: UiPartValue; thead: UiPartValue; th: UiPartValue; sortButton: UiPartValue; grip: UiPartValue; tbody: UiPartValue; tr: UiPartValue; td: UiPartValue; empty: UiPartValue; pagination: UiPartValue }>',
    group: 'Props',
    icon: PhSlidersHorizontal,
  },
  {
    id: 'worst:event',
    kind: 'events',
    label: 'update:selectedKeys',
    parent: 'TreeSelect',
    scope: 'DateRangePickerPresets',
    to: to('TreeSelect', '#events-update-selectedKeys'),
    description: '',
    group: 'Events',
    copy: 'v-model:selected-keys="selectedKeys"',
    copyKind: 'usage',
    icon: PhLightning,
  },
  {
    id: 'worst:slot',
    kind: 'slots',
    label: 'item',
    parent: 'CascadeSelect',
    scope: 'DateRangePickerPresets',
    to: to('CascadeSelect', '#slots-item'),
    type: undefined,
    description:
      'Custom row content; receives item, index, depth, selected, expanded, disabled, highlighted, path, select, toggle and the row element.',
    group: 'Slots',
    copy: '<template #item="{ item, index, depth, selected, expanded, disabled, highlighted, path, select, toggle, el }"></template>',
    copyKind: 'usage',
    icon: PhPuzzlePiece,
  },
  {
    id: 'worst:example',
    kind: 'example',
    label: '✨ Six overlay families deep, all open at once, Tour still on top of everything',
    parent: 'BreadcrumbSeparator',
    scope: 'DateRangePickerPresets',
    to: to('Popover', '#example-x'),
    fallbackId: 'examples',
    group: 'Examples',
    copyKind: 'link',
    icon: PhPlayCircle,
  },
]

/** The pages and deep entries the palette searches, in the chosen stress mode. */
export function withFixture(
  mode: DataMode,
  pages: PaletteEntry[],
  deep: PaletteEntry[],
): { pages: PaletteEntry[]; deep: PaletteEntry[] } {
  switch (mode) {
    case 'worst':
      return { pages: [WORST[0]!, ...pages], deep: [...WORST.slice(1), ...deep] }
    case 'empty':
      return { pages: [], deep: [] }
    case 'one':
      return { pages: pages.slice(0, 1), deep: [] }
    case 'huge': {
      // Three times today's index: roughly where 150 components would put it.
      const copies = (list: PaletteEntry[], n: number) =>
        Array.from({ length: n }, (_, i) =>
          list.map((entry) => ({ ...entry, id: `${entry.id}#${i}` })),
        ).flat()
      return { pages: copies(pages, 3), deep: copies(deep, 3) }
    }
    default:
      return { pages, deep }
  }
}
