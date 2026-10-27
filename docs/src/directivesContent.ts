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
  /** Shown after the examples: what needs more than a row in a table. */
  sections?: { id: string; title: string; body: string; code?: string }[]
}

export const directivesContent: Record<string, DirectiveContent> = {
  vAnimate: {
    label: 'v-animate',
    description:
      "Animates any element: in as it mounts, out as it leaves, to a new look when its values change, and to its new place when layout moves it. It plays on the same motion system as the components, so a ConfigProvider's spring, `motion: false` and reduced motion apply to it too. The Motion section covers it in depth, with examples for each case. It comes from `vael-ui/motion`; in a Vapor component, import `vAnimateVapor` from there instead (as `vAnimate`, or write `v-animate-vapor`).",
    installNames: ['vAnimate'],
    sections: [
      {
        id: 'names',
        title: 'Names',
        body: "The word after the colon, as in `v-animate:rows`, is a name. An element on its own doesn't need one. Name elements when they belong together: elements under one name that come in at the same time are one group, so `stagger` plays them one after another. Inside a vael-ui component, such as a Dialog, its `motion.targets.rows` sets how the elements named `rows` move, and they come and go with the component. `after: 'rows'` lets another element wait for them, and pages under one name can wait for each other with `swap: 'wait'`.",
        code: `<!-- On its own: no name. -->
<p v-animate.rise>Saved</p>

<!-- One group: they come in one after another. -->
<li
  v-for="row in rows"
  :key="row.id"
  v-animate:rows.rise="{ stagger: true }"
>…</li>

<!-- In a component: they move with the dialog. -->
<Dialog :motion="{ targets: { rows: { initial: { y: 6 } } } }">
  <li v-for="row in rows" :key="row.id" v-animate:rows>…</li>
</Dialog>`,
      },
    ],
    value: [
      {
        name: 'string',
        type: 'string',
        description:
          'The name of a preset from the `presets` of a ConfigProvider `motion` style around it.',
      },
      {
        name: 'initial',
        type: 'MotionValues | ((where) => MotionValues)',
        description:
          'Where it comes in from as it mounts: `{ opacity: 0, y: 8 }`. It plays to its own style.',
      },
      {
        name: 'exit',
        type: 'MotionValues | ((where) => MotionValues) | false',
        description:
          'Where it leaves to, inside a `v-if` or `v-for`. Unset, it leaves back the way it came, quicker. `false` leaves at once.',
      },
      {
        name: 'animate',
        type: 'MotionValues',
        description:
          'A look it holds while bound, moving to each new one from wherever it is on screen: `{ rotate: open ? 180 : 0 }`. Keyframe arrays play once per change, or loop with `repeat`.',
      },
      {
        name: 'spring / duration / easing',
        type: 'SpringName | Spring / number | string / string',
        description:
          "Its timing: a spring by name (`'snappy'`, `'smooth'`, `'bouncy'`, `'gentle'`) or `{ damping, response }`, or a duration in ms with any CSS easing or a token by name (`'out'`, `'pop'`). Unset, it uses the ConfigProvider's spring. A single value can carry its own: `{ y: { value: 8, duration: 200 } }`.",
      },
      {
        name: 'delay',
        type: 'number',
        description:
          'Seconds before it starts: its entrance, and a `layout` slide, which holds its old place meanwhile.',
      },
      {
        name: 'stagger',
        type: "boolean | 'end' | 'center' | 'edges' | number | ((index, count) => number)",
        description:
          "Elements that share a name (`v-animate:rows`) come in one after another, in page order. `true` spaces them by the stagger token (40 ms); `'end'`, `'center'` or `'edges'` start the wave there. A number is the seconds between them; a function gives each its own start.",
      },
      {
        name: 'after',
        type: 'string | string[]',
        description:
          "Starts after a moment in another named element's motion: `'summary'`, `'summary:start'`, `'summary:60%'` or `'summary:settle'`. Inside a component, or among elements that appear together.",
      },
      {
        name: 'steps',
        type: 'MotionStep[]',
        description: 'A series of stops, each with its own `to`, timing and `after` moment.',
      },
      {
        name: 'replay',
        type: 'unknown',
        description:
          'Plays `initial` again whenever this value changes, without remounting: a count going up, a failed copy.',
      },
      {
        name: 'appear',
        type: "boolean | 'later'",
        description:
          "`false`: no entrance on mount; `replay` and its exit still play. `'later'`: no entrance for what's there at the first render, one for anything added after. Default `true`.",
      },
      {
        name: 'layout',
        type: "boolean | 'position'",
        description:
          "Slides to wherever layout puts it, such as when a list reorders or a sibling grows. `'position'` moves it without resizing on the way.",
      },
      {
        name: 'layoutId',
        type: 'string',
        description:
          "Elements that share one are a single element moving between places: when one leaves and another arrives together, the newcomer slides from the old one's box.",
      },
      {
        name: 'states',
        type: '{ hover?, active?, focus? }',
        description:
          "Looks it holds while hovered (a mouse), pressed (pointer, Space or Enter) or focused, as a component's `states`: `{ hover: { scale: 1.03 }, active: { scale: 0.97 } }`.",
      },
      {
        name: 'when',
        type: "'mount' | 'visible'",
        description:
          "`'visible'` waits until it's scrolled into view, then plays once. Default `'mount'`.",
      },
      {
        name: 'progress',
        type: 'number',
        description:
          'With keyframe arrays in `animate`: holds them at this point, from 0 to 1, so a swipe or a scroll scrubs them.',
      },
    ],
    modifiers: [
      {
        name: '.fade / .rise / .drop / .pop / .blur',
        type: '—',
        description:
          'A built-in entrance: `v-animate.rise`. A value tunes it (`v-animate.rise="{ delay: 0.1 }"`), and your own presets work the same way once listed in `MotionPresets`.',
      },
      {
        name: '.snappy / .smooth / .bouncy / .gentle',
        type: '—',
        description: 'The spring it moves on: `v-animate.pop.bouncy`.',
      },
      {
        name: '.stagger',
        type: '—',
        description: 'With a name, `stagger: true`: `v-animate:rows.rise.stagger`.',
      },
      {
        name: ':name',
        type: '—',
        description:
          "Names the element, as `v-animate:rows`: elements that share a name stagger together, `after` can wait for it, inside a component it marks one of the targets its `motion` animates, and pages under one name can wait for each other with `swap: 'wait'`. An element on its own needs no name.",
      },
      {
        name: '.size',
        type: '—',
        description:
          "Eases the element to its content's new size instead of jumping. On its own (`v-animate.size`), it takes no value.",
      },
    ],
  },
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
  vHoverIndicator: {
    label: 'v-hover-indicator',
    description:
      "Gives your own list the hover highlight vael-ui's lists have: one highlight that slides to the row under the pointer, or to the row with keyboard focus, instead of each row changing color on its own. It adds the highlight element and the positioning itself. Touch doesn't move it, as with hover styles. It follows a ConfigProvider's `indicator` and `motion`, so a spring or `motion: false` applies here too. The highlight is the list's first child, so a `:first-child` rule for your rows needs `:first-of-type` or a class instead. The Vapor build exports its own version under the same name from `vael-ui/vapor`.",
    installNames: ['vHoverIndicator'],
    value: [
      {
        name: 'string',
        type: 'string',
        description:
          "A CSS selector for the rows, such as `v-hover-indicator=\"'.row'\"`. Rows that are disabled don't get the highlight.",
      },
      {
        name: 'itemSelector',
        type: 'string',
        description: 'The same selector, in the object form.',
      },
      {
        name: 'over',
        type: 'boolean',
        description:
          'Draws the highlight as a see-through tint over the rows instead of behind them, for rows with a solid background. Set the tint with `--ui-indicator-over-bg`. Same as the `.over` modifier.',
      },
      {
        name: 'orientation',
        type: "'vertical' | 'horizontal'",
        description:
          "`'horizontal'` for items side by side, such as a row of tabs. Default `'vertical'`.",
      },
      {
        name: 'scope',
        type: 'string',
        description:
          'A row counts only when its nearest match for this selector is the list itself, so a list nested inside another keeps its own rows.',
      },
      {
        name: 'scroller',
        type: 'boolean',
        description:
          "The list scrolls, and the highlight scrolls with its rows. Unset, it checks the list's own overflow.",
      },
      {
        name: 'group',
        type: 'string',
        description:
          'Lists with the same group hand the highlight over: moving the pointer from one to the next, it slides across instead of fading out and in.',
      },
      {
        name: 'class',
        type: 'string',
        description:
          'A class of your own on the highlight element. In a component with scoped styles, style it with `:deep(.your-class)`, since the directive creates the element.',
      },
      {
        name: 'enabled',
        type: 'boolean',
        description:
          '`false` hides the highlight and stops it following the pointer, such as while a row is being dragged. A value of `false` removes it instead.',
      },
    ],
    modifiers: [
      {
        name: '.over',
        type: '—',
        description: 'Sets `over`.',
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
          "The axis items reorder along: `'y'` for a column, `'x'` for a row. Default `'y'`. When the items wrap onto more lines (a card grid), they reorder in reading order and make room slot by slot, on either axis.",
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
