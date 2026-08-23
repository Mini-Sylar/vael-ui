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
      'Attaches a floating label to hover/focus. Needs a single `<TooltipHost />` mounted once near your app root (see the Global Setup guide) — every `v-tooltip` in the app shares it. Ships both a VDOM directive and a Vapor-compatible function variant; the build picks the right one automatically.',
    installNames: ['vTooltip'],
    value: [
      { name: 'string', type: 'string', description: 'Shorthand for `{ content }`.' },
      { name: 'content', type: 'string', description: 'The tooltip text. Required either way.' },
      {
        name: 'side',
        type: "'top' | 'bottom' | 'left' | 'right'",
        description: 'Can also be set with a modifier instead — see below.',
      },
      { name: 'align', type: 'Align', description: '' },
      {
        name: 'openDelay / closeDelay',
        type: 'number',
        description: 'Milliseconds before showing/hiding.',
      },
      {
        name: 'beforeClose',
        type: '(done: () => void) => void',
        description:
          "Per-target override of TooltipHost's own `beforeClose` prop, since the host is a single shared singleton.",
      },
      {
        name: 'forceMount',
        type: 'boolean',
        description: "Per-target override of TooltipHost's `forceMount` prop.",
      },
    ],
    modifiers: [
      {
        name: '.top / .bottom / .left / .right',
        type: '—',
        description: 'Sets `side` when the value is the plain string form.',
      },
    ],
  },
  vScrollMask: {
    label: 'v-scroll-mask',
    description:
      "Fades the edge of a scroll container as content passes under it, and removes the fade once you're at the end — a soft edge instead of a hard clipped cutoff. Re-checks on resize via a `ResizeObserver`, so it stays correct if the content or container changes size.",
    installNames: ['vScrollMask'],
    value: [
      {
        name: 'boolean',
        type: 'boolean',
        description: '`false` removes the mask entirely; any other value enables it.',
      },
      {
        name: "'x' | 'y' | 'both'",
        type: 'ScrollMaskAxis',
        description: "Which edge(s) to mask. Defaults to `'y'` when the value is empty.",
      },
    ],
  },
  vDraggable: {
    label: 'v-draggable',
    description:
      'Container-level sugar for "make this list draggable" — sorting tabs, files, or any plain array without reaching for the full `<Sortable>` component. It runs the exact same spring-driven reorder engine as `<Sortable>` and `Tree`, so the motion and drag preview are identical by construction. Rows are addressed by position, so there\'s no keyboard path — reach for `<Sortable>` when you need one. It ships no styling of its own: while dragging, the grabbed element gets a `data-dragging` attribute and a floating preview follows the pointer — style `[data-dragging] { opacity: 0 }` yourself, or the original stays visible and overlaps whatever slides into its place.',
    installNames: ['vDraggable'],
    value: [
      { name: 'T[]', type: 'T[]', description: 'The array directly, reordered in place on drop.' },
      { name: 'items', type: 'T[]', description: 'The array to reorder.' },
      { name: 'axis', type: "'x' | 'y'", description: "Defaults to `'y'`." },
      {
        name: 'handle',
        type: 'string',
        description:
          'CSS selector for the grab surface inside each child. Defaults to the whole child.',
      },
      { name: 'disabled', type: 'boolean', description: '' },
      {
        name: 'onReorder',
        type: '(from: number, to: number) => void',
        description: '',
      },
    ],
  },
}
