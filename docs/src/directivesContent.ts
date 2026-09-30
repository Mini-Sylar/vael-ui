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
      'Shows a floating label on hover and focus. Mount one `<TooltipHost />` near your app root (see the Global Setup guide). Every `v-tooltip` in the app shares it. `vael-ui/vapor` exports a Vapor-compatible version under the same name.',
    installNames: ['vTooltip'],
    value: [
      { name: 'string', type: 'string', description: 'Shorthand for `{ content }`.' },
      { name: 'content', type: 'string', description: 'The tooltip text. Required in both forms.' },
      {
        name: 'side',
        type: "'top' | 'bottom' | 'left' | 'right'",
        description: 'You can also set it with a modifier (see below).',
      },
      { name: 'align', type: 'Align', description: '' },
      {
        name: 'openDelay / closeDelay',
        type: 'number',
        description: 'Delay in ms before the tooltip shows or hides.',
      },
      {
        name: 'beforeClose',
        type: '(done: () => void) => void',
        description:
          "Overrides TooltipHost's `beforeClose` prop for this target. The host is shared, so this is how you set it per target.",
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
      'Fades the edges of a scroll container where content overflows, so you get a soft edge instead of a hard cutoff. The fade at an edge disappears when you scroll all the way to it. A `ResizeObserver` re-checks overflow when the content or container changes size.',
    installNames: ['vScrollMask'],
    value: [
      {
        name: 'boolean',
        type: 'boolean',
        description: '`false` removes the mask. Any other value enables it.',
      },
      {
        name: "'x' | 'y' | 'both'",
        type: 'ScrollMaskAxis',
        description: "Which edges to mask. Defaults to `'y'` when the value is empty or `true`.",
      },
    ],
  },
  vDraggable: {
    label: 'v-draggable',
    description:
      "Makes a list draggable from its container. Reorder tabs, files or any plain array without the full `<Sortable>` component. It runs the same spring-driven engine as `<Sortable>` and `Tree`, so the motion and drag preview match. Rows are tracked by position, so there's no keyboard support and no announcements. Use `<Sortable>` when you need those. While you drag, the grabbed element floats as a preview and the original hides in place. You don't need to style either state.",
    installNames: ['vDraggable'],
    value: [
      { name: 'T[]', type: 'T[]', description: 'The array itself, reordered in place on drop.' },
      { name: 'items', type: 'T[]', description: 'The array to reorder.' },
      { name: 'axis', type: "'x' | 'y'", description: "Defaults to `'y'`." },
      {
        name: 'handle',
        type: 'string',
        description:
          'CSS selector for the grab area inside each child. Defaults to the whole child.',
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
          'Shares drag sessions with other lists (`v-draggable` or `useSortable()`) that get the same handle from `useSortableGroup()`. Items can then move between them. `groupId` is auto-assigned if you omit it.',
      },
    ],
  },
}
