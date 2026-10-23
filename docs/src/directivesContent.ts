import type { MetaRow } from './types'

export interface DirectiveContent {
  /** Template usage, e.g. "v-tooltip" — the H1, not the JS export name. */
  label: string
  description: string
  /** Real named exports for the install snippet. */
  installNames: string[]
  /** The shape(s) the directive's value can take. */
  value: MetaRow[]
  /** Only shown when non-empty. */
  modifiers?: MetaRow[]
}

export const directivesContent: Record<string, DirectiveContent> = {
  vTooltip: {
    label: 'v-tooltip',
    description:
      'Shows a tooltip on hover and keyboard focus. Every `v-tooltip` in the app shares one `<TooltipHost />`, which you mount near your app root (see the Global Setup guide). The Vapor build exports its own version under the same name from `vael-ui/vapor`.',
    installNames: ['vTooltip'],
    value: [
      {
        name: 'string',
        type: 'string',
        description: 'The tooltip text, shorthand for `{ content }`.',
      },
      { name: 'content', type: 'string', description: 'The tooltip text. Required in both forms.' },
      {
        name: 'side',
        type: "'top' | 'bottom' | 'left' | 'right'",
        description: 'The side of the target to open on. You can also set it with a modifier.',
      },
      { name: 'align', type: 'Align', description: '' },
      {
        name: 'sideOffset',
        type: 'number | (() => number)',
        description:
          'The gap between the target and the tooltip, in px. Default `8`. A function is read each time the tooltip is positioned, for a target whose size is still changing, such as a magnifying Dock item.',
      },
      {
        name: 'openDelay / closeDelay',
        type: 'number',
        description: 'The wait before the tooltip opens or closes, in ms.',
      },
      {
        name: 'beforeClose',
        type: 'BeforeClose',
        description:
          "This target's own close guard, in place of TooltipHost's `beforeClose`. One host serves every target, so this is how you set a guard per target.",
      },
      {
        name: 'forceMount',
        type: 'boolean',
        description: "Overrides TooltipHost's `forceMount` prop for this target.",
      },
    ],
    modifiers: [
      {
        name: '.top / .bottom / .left / .right',
        type: '—',
        description: "Sets `side` when the value doesn't set it.",
      },
    ],
  },
  vScrollMask: {
    label: 'v-scroll-mask',
    description:
      'Fades the edges of a scroll container where content overflows, so you get a soft edge instead of a hard cutoff. The fade at an edge disappears when you scroll all the way to it. A `ResizeObserver` checks the overflow again when the content or container changes size.',
    installNames: ['vScrollMask'],
    value: [
      {
        name: 'boolean',
        type: 'boolean',
        description:
          'Turns the mask on or off: `false` removes it, and any other value turns it on.',
      },
      {
        name: "'x' | 'y' | 'both'",
        type: 'ScrollMaskAxis',
        description: "Which edges to fade. Default `'y'` when the value is empty or `true`.",
      },
    ],
  },
  vDraggable: {
    label: 'v-draggable',
    description:
      "Lets you reorder a container's children by dragging them: tabs, files or any plain array, without the full `<Sortable>` component. It runs the same engine as `<Sortable>` and `Tree`, so the motion and drag preview match. Rows are tracked by position, so there's no keyboard support and no screen reader announcements; use `<Sortable>` when you need those. While you drag, the grabbed element floats as a preview and the original hides in place, with no styling from you.",
    installNames: ['vDraggable'],
    value: [
      { name: 'T[]', type: 'T[]', description: 'The array itself, reordered in place on drop.' },
      { name: 'items', type: 'T[]', description: 'The array to reorder.' },
      {
        name: 'axis',
        type: "'x' | 'y'",
        description:
          "The axis items reorder along: `'y'` for a column, `'x'` for a row. Default `'y'`.",
      },
      {
        name: 'handle',
        type: 'string',
        description:
          'A CSS selector for the grab area inside each child. Default: the whole child.',
      },
      {
        name: 'touchDragDelay',
        type: 'number',
        description:
          'How long a touch must hold a child still before a drag starts, in ms. Set it only when a child is also tappable for something else. Mouse and pen are unaffected. Default `0`.',
      },
      { name: 'disabled', type: 'boolean', description: 'Turns off dragging.' },
      {
        name: 'onReorder',
        type: '(from: number, to: number) => void',
        description:
          'Fires on a committed drop with the old and new index. Items have no stable key here, so the index is the only way to identify the moved item.',
      },
      {
        name: 'group / groupId',
        type: 'SortableGroupHandle / string | number',
        description:
          'Shares drag sessions with other lists (`v-draggable` or `useSortable()`) that get the same handle from `useSortableGroup()`. Items can then move between them. Without a `groupId`, it assigns one.',
      },
    ],
  },
}
