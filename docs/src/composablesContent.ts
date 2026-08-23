import type { MetaRow } from './types'

export interface ComposableContent {
  description: string
  /** Real named exports for the install snippet. Defaults to just the page
   * name, but a few pages (useToast, useDialogService) group several real
   * exports under one taxonomy/route name that isn't itself an export. */
  installNames?: string[]
  /** Has a matching `Use${Name}Demo.vue` in `composable-demos/` when true. */
  hasLiveDemo?: boolean
  /** Other `composable-demos/*.vue` files the main demo imports, such as a
   * custom child component, whose source is concatenated into the shown
   * code block too, so the code readers see actually matches what runs. */
  extraSourceFiles?: string[]
  /** Shown when there's no live demo: a realistic, accurate usage snippet. */
  exampleCode?: string
  params: MetaRow[]
  returns: MetaRow[]
}

export const composablesContent: Record<string, ComposableContent> = {
  confirmAction: {
    description:
      "One function for async-aware confirm flows, either centered (`surface: 'dialog'`, the default) or anchored to a trigger (`surface: 'popover'`, requires `triggerEl`); a discriminated union on `surface` picks which options TypeScript actually offers you. `onConfirm` is awaited before closing: the confirm button stays in its loading state until it settles, and the surface closes only on success. A rejection leaves it open and fires `onError` instead of closing out from under a failed action. Not a new component, just sugar over `openDialog`/`openPopover`, both still there for anything this doesn’t cover.",
    hasLiveDemo: true,
    params: [
      { name: 'title', type: 'string', description: 'Required either way.' },
      { name: 'description', type: 'string', description: '' },
      {
        name: 'confirmLabel / cancelLabel',
        type: 'string',
        description: "Default 'Confirm' / 'Cancel'.",
      },
      {
        name: 'variant',
        type: 'ButtonVariant',
        description:
          "Confirm button style. Default 'primary'; use 'danger' for destructive actions.",
      },
      {
        name: 'onConfirm',
        type: '() => unknown | Promise<unknown>',
        description: 'Awaited before closing.',
      },
      { name: 'onCancel', type: '() => void', description: '' },
      {
        name: 'onError',
        type: '(error: unknown) => void',
        description: 'Fires when onConfirm rejects.',
      },
      {
        name: 'confirmButtonProps / cancelButtonProps',
        type: 'Partial<ButtonProps>',
        description: 'Full prop passthrough beyond the label/variant shortcuts.',
      },
      {
        name: 'body / bodyProps',
        type: 'Component / Record<string, unknown>',
        description:
          'Extra content between the description and the buttons, e.g. a "type DELETE" input.',
      },
      { name: 'surface', type: "'dialog' | 'popover'", description: "Default 'dialog'." },
      {
        name: 'position / size',
        type: 'DialogPosition / DialogSize',
        description: "surface: 'dialog' only, same as Dialog's own props.",
      },
      {
        name: 'triggerEl',
        type: 'TriggerRef',
        description:
          "surface: 'popover' only. Required, same contract as openPopover's own triggerEl.",
      },
      {
        name: 'side / align / sideOffset / …',
        type: 'PopoverProps',
        description: "surface: 'popover' only. Every other Popover prop, passed straight through.",
      },
    ],
    returns: [
      {
        name: 'result',
        type: 'Promise<boolean | undefined>',
        description:
          'true on confirm, false on cancel, undefined on Escape/outside-click dismissal.',
      },
      {
        name: 'close',
        type: '(result?: boolean) => void',
        description: "Close imperatively from the opener's side.",
      },
      {
        name: 'panelEl',
        type: '{ readonly value: HTMLElement | null }',
        description:
          'Null until the surface actually mounts; useful for GSAP/motion-v enter animations.',
      },
    ],
  },

  useDialogService: {
    description:
      'The imperative engine behind `<Dialog>` for dialogs opened from code instead of markup. `openDialog(Component, options)` mounts any component as the body (typed props included) and returns a `result` promise that settles with whatever the opened component’s `useDialogRef().close(result)` passes. This is the low-level primitive `confirmAction()` itself is built on; reach for it directly for anything beyond a plain confirm (a rename form, a multi-step flow, …).',
    installNames: ['openDialog', 'useDialogRef', 'useDialogQueue'],
    hasLiveDemo: true,
    extraSourceFiles: ['RenameFileDialogBody.vue', 'DeleteFileDialogBody.vue'],
    params: [],
    returns: [
      {
        name: 'openDialog(component, options)',
        type: 'OpenDialogHandle<T>',
        description:
          'Mounts component inside <Dialog>, rendered by the app-level <DialogHost/>. options.props is typed against the component you pass.',
      },
      {
        name: 'useDialogRef()',
        type: 'DialogRef<D, T>',
        description:
          'Called from inside the opened component. { data, panelEl, close(result) }: close() is what settles the opener’s result promise.',
      },
      {
        name: 'useDialogQueue()',
        type: 'DynamicDialogEntry[]',
        description: 'The live queue <DialogHost/> renders. Mount DialogHost once at the app root.',
      },
    ],
  },

  usePopoverService: {
    description:
      "The imperative engine behind `<Popover>` for anchored popovers opened from code instead of markup. `openPopover(Component, options)` mounts any component inside a Popover anchored to `options.triggerEl` (required, since an imperative popover has no inline `#trigger` slot to derive it from), and returns a `result` promise that settles with whatever the opened component’s `usePopoverRef().close(result)` passes. This is the low-level primitive `confirmAction({ surface: 'popover' })` is built on; reach for it directly for anything beyond a plain confirm.",
    installNames: ['openPopover', 'usePopoverRef', 'usePopoverQueue'],
    hasLiveDemo: true,
    extraSourceFiles: ['RemoveTagPopoverBody.vue'],
    params: [],
    returns: [
      {
        name: 'openPopover(component, options)',
        type: 'OpenPopoverHandle<T>',
        description:
          'Mounts component inside <Popover>, rendered by the app-level <PopoverHost/>. options.props is typed against the component you pass; options.triggerEl is required.',
      },
      {
        name: 'usePopoverRef()',
        type: 'PopoverRef<D, T>',
        description:
          'Called from inside the opened component. { data, panelEl, close(result) }: close() is what settles the opener’s result promise.',
      },
      {
        name: 'usePopoverQueue()',
        type: 'DynamicPopoverEntry[]',
        description:
          'The live queue <PopoverHost/> renders. Mount PopoverHost once at the app root, alongside DialogHost.',
      },
    ],
  },

  useToast: {
    description:
      'Sonner-style imperative toasts: call `toast(title, options)` from anywhere, no component context needed. `toast.success/error/warning/info/loading` are shortcuts for each variant, and `toast.promise(input, messages)` shows a loading toast immediately and swaps it for success/error once the promise settles, with no manual dismiss() bookkeeping. Requires a `<Toaster/>` mounted once at the app root to actually render.',
    installNames: ['toast', 'useToastQueue'],
    hasLiveDemo: true,
    params: [],
    returns: [
      {
        name: 'toast(title, options?)',
        type: 'number',
        description: 'Pushes a default-variant toast; returns its id (for dismiss(id)).',
      },
      {
        name: 'toast.success / .error / .warning / .info / .loading',
        type: '(title, options?) => number',
        description: 'Same signature, fixed variant. loading defaults to duration: Infinity.',
      },
      {
        name: 'toast.promise(input, messages, options?)',
        type: 'Promise<T>',
        description:
          'input is a Promise or a function returning one. Shows messages.loading immediately, then messages.success/.error (string or a function of the settled value/error).',
      },
      {
        name: 'toast.dismiss(id?)',
        type: '(id?: number) => void',
        description: 'Dismisses one toast, or every toast when id is omitted.',
      },
      {
        name: 'useToastQueue()',
        type: '{ toasts, dismiss, pauseAll, resumeAll }',
        description:
          'Read-only queue access plus pause/resume: what <Toaster/> itself uses internally (e.g. pausing timers on pointerenter).',
      },
    ],
  },

  useTour: {
    description:
      'The headless state machine behind `<Tour>` — index/group bookkeeping, step navigation, and the `onBeforeEnter`-await sequencing, with zero DOM or rendering baked in. `<Tour>` is just `useTour()` plus a spotlight overlay and a composed `Popover` callout; reach for this directly to build a fully custom walkthrough UI (a different animation library, a non-floating callout, an embedded panel) and keep only the sequencing logic.',
    exampleCode: `import { ref } from 'vue'
import { useTour } from 'vael-ui'
import type { TourStep } from 'vael-ui'

const open = ref(false)
const steps: TourStep[] = [
  { target: '#new-doc', title: 'Create something new' },
  { target: '#share', title: 'Invite your team' },
]

const { currentStep, currentIndex, total, isFirst, isLast, isTransitioning, next, prev, skip } =
  useTour(open, {
    steps,
    onFinish: () => console.log('tour finished'),
  })

// Point your own spotlight/callout at currentStep.value.target; next()/prev()/skip()
// drive it, isTransitioning tells you when an onBeforeEnter is still pending.
open.value = true`,
    params: [
      {
        name: 'open',
        type: 'Ref<boolean>',
        description:
          "Owns the tour's visibility. Setting it true resets to the first step (awaits that step's onBeforeEnter, then fires onStepChange with reason: 'open'); setting it false is just \"closed,\" no reset happens on its own.",
      },
      {
        name: 'id',
        type: 'string',
        description:
          "Identifies this tour instance. Not used internally — echoed back on every callback's details, useful once a page has more than one tour and a shared handler needs to tell them apart.",
      },
      {
        name: 'steps',
        type: 'MaybeRefOrGetter<readonly TourStep[]>',
        description:
          "Same shape as `<Tour>`'s own steps prop: target (a DOMTarget) plus title/description/side/align/spotlightPadding/spotlightRadius/disableInteraction/onBeforeEnter/group per step.",
      },
      {
        name: 'onStepChange',
        type: '(details: TourStepChangeDetails) => void',
        description:
          "Fires after a step change settles, including the first step (reason: 'open'). details: { index, step, reason, previousIndex, previousStep, id }.",
      },
      {
        name: 'onSkip',
        type: '(details: TourEndDetails) => void',
        description: 'Fires when skip() is called. details: { index, step, id }.',
      },
      {
        name: 'onFinish',
        type: '(details: TourEndDetails) => void',
        description: 'Fires when next() is called on the last step. details: { index, step, id }.',
      },
    ],
    returns: [
      {
        name: 'id',
        type: 'string | undefined',
        description: 'Echoed straight back from options.id.',
      },
      { name: 'currentIndex', type: 'Ref<number>', description: '' },
      { name: 'currentStep', type: 'ComputedRef<TourStep | undefined>', description: '' },
      { name: 'currentGroup', type: 'ComputedRef<string | undefined>', description: '' },
      {
        name: 'groups',
        type: 'ComputedRef<TourGroup[]>',
        description: '{ group, steps }[], bucketed in first-seen order.',
      },
      { name: 'total / isFirst / isLast', type: 'ComputedRef', description: '' },
      {
        name: 'isTransitioning',
        type: 'Ref<boolean>',
        description:
          "True while the current step's onBeforeEnter is pending — keep the previous step's UI mounted until this clears.",
      },
      {
        name: 'next / prev',
        type: '() => Promise<void>',
        description:
          'next() on the last step calls onFinish and sets open.value = false instead of advancing.',
      },
      {
        name: 'skip',
        type: '() => void',
        description: 'Fires onSkip and sets open.value = false.',
      },
      { name: 'goTo', type: '(index: number) => Promise<void>', description: '' },
      {
        name: 'goToGroup',
        type: '(group: string) => Promise<void>',
        description: "Jumps to that group's first step.",
      },
    ],
  },

  useAsyncLoading: {
    description:
      'Tracks every in-flight promise passed to `run()`. `loading` only clears once ALL of them have settled, so overlapping calls (or several buttons sharing one instance) never flicker the state early. This is exactly what `Button`’s own `loading="auto"` uses internally for promise-returning `@click` handlers.',
    hasLiveDemo: true,
    params: [],
    returns: [
      {
        name: 'loading',
        type: 'ComputedRef<boolean>',
        description: 'True while at least one call to run() hasn’t settled yet.',
      },
      {
        name: 'run',
        type: '<T>(fn: () => T | Promise<T>) => Promise<T>',
        description: 'Wraps fn, incrementing/decrementing the in-flight count around it.',
      },
    ],
  },

  useNumberFormat: {
    description:
      "Locale-aware number formatting and parsing, both directions kept perfectly in sync. `format` turns a number into the full localized+affixed display string, `parse` turns typed text back into a number (or `null` for anything incomplete or invalid), and `isPartial` tells a legal mid-typing state ('', '-', '1.') apart from actual garbage so you don’t fight the user while they’re still typing. This is exactly what `InputNumber` uses internally for its own currency/percent/decimal modes.",
    hasLiveDemo: true,
    params: [
      {
        name: 'locale',
        type: 'MaybeRefOrGetter<string | undefined>',
        description: 'Defaults to the runtime locale.',
      },
      {
        name: 'mode',
        type: "MaybeRefOrGetter<'decimal' | 'currency' | 'percent' | undefined>",
        description: "Default 'decimal'.",
      },
      {
        name: 'currency',
        type: 'MaybeRefOrGetter<string | undefined>',
        description: "ISO code, e.g. 'USD'. Default 'USD' when mode is currency.",
      },
      {
        name: 'minFractionDigits',
        type: 'MaybeRefOrGetter<number | undefined>',
        description: 'Passed to Intl.NumberFormat.',
      },
      {
        name: 'maxFractionDigits',
        type: 'MaybeRefOrGetter<number | undefined>',
        description: 'Passed to Intl.NumberFormat.',
      },
      {
        name: 'useGrouping',
        type: 'MaybeRefOrGetter<boolean | undefined>',
        description: 'Thousands separators. Default true.',
      },
      {
        name: 'prefix / suffix',
        type: 'MaybeRefOrGetter<string | undefined>',
        description:
          'Literal affix Intl has no concept of (e.g. a unit label); stripped on parse, appended on format.',
      },
    ],
    returns: [
      {
        name: 'format',
        type: '(value: number | null) => string',
        description: "null/NaN -> ''. Always the full localized+affixed string.",
      },
      {
        name: 'parse',
        type: '(text: string) => number | null',
        description:
          'null for anything that isn’t a complete, unambiguous number, including legal in-progress typing states.',
      },
      {
        name: 'isPartial',
        type: '(text: string) => boolean',
        description:
          'True for legal mid-typing states parse correctly returns null for but that must not be rejected.',
      },
    ],
  },

  useColorScheme: {
    description:
      'Drives `document.documentElement.dataset.theme` from a `system` / `light` / `dark` mode. `system` removes the attribute entirely and follows `prefers-color-scheme` live. This is the exact composable the docs site’s own header theme toggle uses; `persist` is structural (like ConfigProvider’s `i18n`) so you can wire in cookies, a store, or localStorage yourself instead of the composable assuming one.',
    exampleCode: `import { useColorScheme } from 'vael-ui'

const { mode, resolvedMode, setMode } = useColorScheme({
  initial: 'system',
  persist: {
    get: () => localStorage.getItem('theme'),
    set: (mode) => {
      if (mode) localStorage.setItem('theme', mode)
      else localStorage.removeItem('theme')
    },
  },
})

// mode.value: 'system' | 'light' | 'dark' (what the user picked)
// resolvedMode.value: 'light' | 'dark' (what's actually applied right now)
setMode('dark')`,
    params: [
      {
        name: 'initial',
        type: "'system' | 'light' | 'dark'",
        description: "Starting mode before persist.get() (if any) resolves. Default 'system'.",
      },
      {
        name: 'persist',
        type: '{ get: () => string | null; set: (mode) => void }',
        description:
          'Structural persistence hook. No default, nothing is persisted unless you pass this.',
      },
    ],
    returns: [
      {
        name: 'mode',
        type: "ShallowRef<'system' | 'light' | 'dark'>",
        description: 'What the user picked.',
      },
      {
        name: 'resolvedMode',
        type: "ShallowRef<'light' | 'dark'>",
        description: "What's actually applied. Resolves 'system' against the live media query.",
      },
      {
        name: 'setMode',
        type: '(mode) => void',
        description: 'Sets mode, persists it, and re-applies.',
      },
    ],
  },

  useFloatingPosition: {
    description:
      'The Floating UI-backed positioning engine behind `Popover`, `Menu`, and `Tooltip`. Computes `positionerStyle` (absolute inset + `visibility`) against a reference/floating element pair, with flip/shift collision handling and live `autoUpdate` tracking while `active` is true. Reach for this directly when building a custom anchored surface none of the existing overlay components fit.',
    hasLiveDemo: true,
    params: [
      { name: 'referenceEl', type: 'Ref<HTMLElement | null>', description: 'The anchor.' },
      {
        name: 'floatingEl',
        type: 'Ref<HTMLElement | null>',
        description: 'The positioned surface.',
      },
      {
        name: 'active',
        type: 'MaybeRefOrGetter<boolean>',
        description: 'Positioning (and autoUpdate scroll/resize tracking) only runs while true.',
      },
      { name: 'side', type: 'MaybeRefOrGetter<Side>', description: "Default 'bottom'." },
      {
        name: 'align',
        type: "MaybeRefOrGetter<'start' | 'center' | 'end'>",
        description: "Default 'center'.",
      },
      {
        name: 'sideOffset',
        type: 'MaybeRefOrGetter<number>',
        description: 'Gap along side. Default 8.',
      },
      {
        name: 'alignOffset',
        type: 'MaybeRefOrGetter<number>',
        description: 'Shift along the align axis.',
      },
      {
        name: 'matchReferenceWidth',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          'Writes the reference’s width into --ui-anchor-inline-size for the positioner to opt into.',
      },
    ],
    returns: [
      {
        name: 'positionerStyle',
        type: 'Ref<Record<string, string>>',
        description: 'Bind directly: :style="positionerStyle".',
      },
      {
        name: 'placement',
        type: 'Ref<Placement>',
        description: 'The resolved placement, post-flip.',
      },
      {
        name: 'transformOrigin',
        type: 'Ref<string>',
        description: 'For scale/fade animations anchored correctly.',
      },
      {
        name: 'maxHeight',
        type: 'Ref<number | null>',
        description: 'Available space in the resolved direction, or null.',
      },
      {
        name: 'update',
        type: '() => Promise<void>',
        description: 'Force a recompute outside the normal auto-update triggers.',
      },
    ],
  },

  useVirtualizer: {
    description:
      'Windowed rendering for long lists: only the visible rows (plus overscan) exist in the DOM. This is what `Select`/`Combobox`/`Tree` reach for once their list gets large; use it directly when building a custom scrollable list that needs the same treatment.',
    hasLiveDemo: true,
    params: [
      { name: 'containerEl', type: 'Ref<HTMLElement | null>', description: 'The scrollable box.' },
      { name: 'count', type: 'MaybeRefOrGetter<number>', description: 'Total row count.' },
      {
        name: 'itemSize',
        type: 'MaybeRefOrGetter<number | undefined>',
        description:
          'Row size in px. Omit to auto-measure the first rendered row (36px estimate until then).',
      },
      {
        name: 'overscan',
        type: 'MaybeRefOrGetter<number>',
        description: 'Extra rows rendered past each edge. Default 8.',
      },
      {
        name: 'onReachEnd',
        type: '() => void',
        description: 'Fires once the rendered window nears count - 1; re-arms when count changes.',
      },
    ],
    returns: [
      {
        name: 'listStyle',
        type: 'Ref<Record<string, string>>',
        description:
          'Bind to a relative, full-height spacer: gives the container real scrollable height.',
      },
      {
        name: 'items',
        type: 'Readonly<Ref<VirtualRow[]>>',
        description: 'The currently rendered window: { index, start, style }.',
      },
      {
        name: 'scrollToIndex',
        type: "(index, align?: 'nearest' | 'start' | 'end' | 'center') => void",
        description:
          "Default 'nearest': what keyboard nav wants, never move a row that's already visible.",
      },
      {
        name: 'measuredSize',
        type: 'Readonly<Ref<number | null>>',
        description: 'The resolved per-row size.',
      },
    ],
  },

  useSortable: {
    description:
      "The spring-driven drag-to-reorder engine behind `<Sortable>`, `<Tree>`'s nested reorder, and `<DataTable>`'s column reorder — pointer and keyboard drive the same grabbed state, and all ordering/nesting decisions live in pure, independently-tested functions. `<Sortable>` is just a thin, optional convenience layer over this; reach for the composable directly when you need custom markup a component can't give you, or when building a cross-container board with `useSortableGroup()`, which wraps this same engine.",
    hasLiveDemo: true,
    params: [
      {
        name: 'rows',
        type: 'MaybeRefOrGetter<readonly FlatSortableRow[]>',
        description:
          'Visible rows in visual order — { value, depth, parentValue } — re-read at grab time.',
      },
      {
        name: 'getElement',
        type: '(value) => HTMLElement | null',
        description: 'Resolves a row to the DOM node the engine measures and transforms directly.',
      },
      {
        name: 'onCommit',
        type: '(value, to: DropPosition) => void',
        description: 'Apply the reorder. Fires once, on a committed drop.',
      },
      {
        name: 'axis',
        type: "MaybeRefOrGetter<'y' | 'x'>",
        description: "Default 'y'. Nesting is only meaningful on 'y'.",
      },
      {
        name: 'nested',
        type: 'MaybeRefOrGetter<boolean>',
        description: 'Enables depth changes — Tree turns this on, a flat list leaves it off.',
      },
      {
        name: 'dropOnTarget',
        type: 'MaybeRefOrGetter<boolean>',
        description: "VS Code model: hovering a row's middle drops INTO it. Requires nested.",
      },
      {
        name: 'reorderSiblings',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          'false disables reordering among current siblings — only re-parenting is offered, with no indicator on a would-be sibling insert. Requires dropOnTarget.',
      },
      {
        name: 'canNestInto',
        type: '(value) => boolean',
        description: 'Which rows accept children. Without this, every row does.',
      },
      {
        name: 'childCountOf',
        type: '(value) => number',
        description: 'Existing child count, so an "inside" drop appends.',
      },
      {
        name: 'dragPreview',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          'Lifts the grabbed row out as a floating preview that follows the cursor, leaving its slot dimmed — without it the row stays in flow and slides over its neighbours. Forced on automatically when `group` is set.',
      },
      { name: 'disabled', type: 'MaybeRefOrGetter<boolean>', description: '' },
      {
        name: 'motionCss',
        type: 'MaybeRefOrGetter<boolean>',
        description: 'false disables the built-in springs — positions snap.',
      },
      {
        name: 'canDrop',
        type: '(details: SortableDropDetails) => boolean',
        description:
          'Synchronous structural veto, re-run while dragging: false marks the target invalid and blocks the drop. Keep it cheap.',
      },
      {
        name: 'beforeDrop',
        type: '(details) => boolean | Promise<boolean>',
        description:
          'Async gate at drop time — return false (or a promise of it) to cancel and spring the item home. Composes with confirmAction().result.',
      },
      {
        name: 'onDropError',
        type: '(error, details) => void',
        description:
          'beforeDrop threw or rejected; the move is already reverted by the time this fires.',
      },
      {
        name: 'labelOf / announce',
        type: '(value) => string / (event) => string',
        description: 'Human label and live-region text for assistive tech.',
      },
      {
        name: 'group / groupId / container',
        type: 'SortableGroupHandle / string | number / MaybeRefOrGetter<HTMLElement | null>',
        description:
          'Shares drag sessions with other useSortable() lists passed the same handle — see useSortableGroup(). container is only needed when group is set, so it can hit-test an empty list.',
      },
    ],
    returns: [
      {
        name: 'activeValue / isGrabbed / isDragging',
        type: 'Ref',
        description:
          'Which row is held, and by which input (isDragging is pointer-only, never a plain click).',
      },
      {
        name: 'isGrabbedValue',
        type: '(value) => boolean',
        description:
          'Bind directly: :data-grabbed="isGrabbedValue(row.value) || undefined". True for a folder\'s whole dragged subtree, not just the row you grabbed.',
      },
      {
        name: 'dropPosition / isValidDrop / isPending',
        type: 'Ref',
        description:
          'Where it would land, whether canDrop currently allows that, and whether an async beforeDrop is still deciding.',
      },
      {
        name: 'dropIntoValue / dropTargetValue / dropIntent',
        type: 'Ref',
        description:
          'Drop-on-target mode only: which row is being hovered, and before/after/inside.',
      },
      {
        name: 'draggedValues',
        type: 'Ref<ReadonlySet>',
        description: 'Every value in the dragged block — a folder carries its descendants.',
      },
      {
        name: 'announcement',
        type: 'Ref<string>',
        description: 'Live-region text. Render it in an aria-live="assertive" node.',
      },
      {
        name: 'onHandlePointerdown / onHandleKeydown',
        type: '(event, value) => void',
        description: "Wire directly to a row's handle element.",
      },
      {
        name: 'consumeSuppressedClick',
        type: '() => boolean',
        description:
          'True exactly once after a committed drag — swallow the trailing click a drag also triggers.',
      },
      {
        name: 'cancel',
        type: '() => void',
        description: 'Abandon the current grab and spring everything home.',
      },
    ],
  },

  useSortableGroup: {
    description:
      "Cross-container drag — the primitive a Kanban-style board is built from, not a component. `<Sortable>`, `<Tree>`, `<DataTable>`'s column reorder, and `v-draggable` all reorder within one list; this is what lets an item cross from one `useSortable()` list into another, over the exact same spring-driven engine. Each list still calls `useSortable()` itself (or `<Sortable>`, which takes the same `group`/`groupId` props directly) — the group only decides which one currently shows the open gap, and runs the actual transfer on drop. The origin list keeps full ownership of the pointer/keyboard gesture for the whole drag; nothing is ever handed off mid-flight.",
    hasLiveDemo: true,
    params: [
      {
        name: 'onTransfer',
        type: '(value, from: GroupDropPosition, to: GroupDropPosition) => void',
        description:
          'The only required option. Fires once, on a committed cross-container drop — splice `value` out of the array named by `from.groupId`, into `to.groupId`. Lives only here, never duplicated per-list, since a cross-boundary decision has no coherent meaning as one column’s opinion versus another’s.',
      },
      {
        name: 'canDrop',
        type: '(details: GroupDropDetails) => boolean',
        description:
          'Vetoes a cross-container move while dragging — a WIP limit on the target column, say. Re-run live; keep it cheap.',
      },
      {
        name: 'beforeDrop',
        type: '(details: GroupDropDetails) => boolean | Promise<boolean>',
        description:
          'Async gate at drop time. Return false (or a promise of it) to cancel and spring the item back home — composes with confirmAction().result exactly like useSortable’s own beforeDrop.',
      },
      {
        name: 'onDropError',
        type: '(error: unknown, details: GroupDropDetails) => void',
        description:
          'beforeDrop threw or rejected; the move is already reverted by the time this fires.',
      },
      {
        name: 'motionCss',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          'false skips the springs for the ghost gap opened in a foreign column while hovering it.',
      },
    ],
    returns: [
      {
        name: 'join(options)',
        type: 'UseSortableReturn',
        description:
          'The ergonomic default: useSortable() with group/groupId already wired in, so a column is one call instead of two things to keep consistent by hand. groupId is optional (auto-assigned if omitted), but a real one is what onTransfer receives to know which array/branch it’s dealing with.',
      },
    ],
  },

  useFieldControl: {
    description:
      'Wires a custom form control into the nearest `<Field>`: id/label association, `aria-describedby`/`aria-invalid`/`aria-required`, and reporting focus/filled state so Field can move a floating label or flip `data-filled`. This is what every built-in input (Input, Select, Checkbox, RadioGroup, …) uses internally; reach for it directly when building a custom control that should plug into Field the same way.',
    hasLiveDemo: true,
    params: [
      {
        name: 'filled',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          'Reactive "does this control currently have a value" signal, reported to the nearest Field, including programmatic v-model writes.',
      },
    ],
    returns: [
      {
        name: 'id',
        type: 'string',
        description:
          "Bind to the control's own id: Field's controlId when present, otherwise a fresh useId().",
      },
      {
        name: 'describedBy',
        type: '() => string | undefined',
        description: 'Bind to aria-describedby.',
      },
      {
        name: 'labelledBy',
        type: '() => string | undefined',
        description:
          'Bind to aria-labelledby on group-shaped controls (RadioGroup) with no single native input.',
      },
      {
        name: 'invalid',
        type: '() => boolean',
        description: "OR this into the control's own invalid prop.",
      },
      { name: 'required', type: '() => boolean', description: 'Bind to aria-required.' },
      {
        name: 'disabled',
        type: '() => boolean',
        description: "Advisory: OR into the control's own disabled prop.",
      },
      {
        name: 'onFocus',
        type: '() => void',
        description: "Call from the control's native focus handler.",
      },
      {
        name: 'onBlur',
        type: '() => void',
        description: "Call from the control's native blur handler.",
      },
    ],
  },
}
