import type { MetaRow } from './types'

export interface ComposableContent {
  description: string
  /** Real named exports for the install snippet — defaults to just the page
   * name, but a few pages (useToast, useDialogService) group several real
   * exports under one taxonomy/route name that isn't itself an export. */
  installNames?: string[]
  /** Has a matching `Use${Name}Demo.vue` in `composable-demos/` when true. */
  hasLiveDemo?: boolean
  /** Other `composable-demos/*.vue` files the main demo imports — e.g. a
   * custom child component — whose source is concatenated into the shown
   * code block too, so the code readers see actually matches what runs. */
  extraSourceFiles?: string[]
  /** Shown when there's no live demo — a realistic, accurate usage snippet. */
  exampleCode?: string
  params: MetaRow[]
  returns: MetaRow[]
}

export const composablesContent: Record<string, ComposableContent> = {
  useConfirmAction: {
    description:
      'Presentation-agnostic confirm/cancel state for async-aware confirm flows. Bind `open` to any overlay’s own `v-model:open` — Popover, Dialog, or a fully custom surface — anchored however that overlay already supports (Popover’s `#trigger` slot or `triggerEl` prop, unchanged). `confirm(action)` keeps the surface open and `pending` true until `action` settles, closing only on success; a rejected action clears `pending`, sets `error`, and leaves the surface open instead of closing out from under a failure.',
    hasLiveDemo: true,
    params: [],
    returns: [
      {
        name: 'open',
        type: 'Ref<boolean>',
        description: 'Bind to whatever overlay you’re anchoring to via its own v-model:open.',
      },
      {
        name: 'pending',
        type: 'Ref<boolean>',
        description:
          'True while a confirm action is in flight. Disable/spin the confirm control on this — never the whole surface.',
      },
      {
        name: 'error',
        type: 'Ref<unknown>',
        description:
          'Set if the last confirm(action) rejected; cleared at the start of the next call.',
      },
      {
        name: 'confirm',
        type: '(action?: () => unknown | Promise<unknown>) => Promise<void>',
        description:
          'Runs action, keeping open true until it settles and closing only on success. Called with no action, closes immediately.',
      },
      {
        name: 'cancel',
        type: '() => void',
        description: 'Always closes immediately — never runs an action, never waits on pending.',
      },
    ],
  },

  useDialogService: {
    description:
      'The imperative engine behind `<Dialog>` for dialogs opened from code instead of markup — `openDialog(Component, options)` mounts any component as the body (typed props included) and returns a `result` promise that settles with whatever the opened component’s `useDialogRef().close(result)` passes. `confirmDialog(options)` is sugar over the same service for the common "title + description + Cancel/Confirm" shape, still accepting a custom `body`/`footer` component for full control.',
    installNames: ['openDialog', 'confirmDialog', 'useDialogRef', 'useDialogQueue'],
    hasLiveDemo: true,
    extraSourceFiles: ['RenameFileDialogBody.vue'],
    params: [],
    returns: [
      {
        name: 'openDialog(component, options)',
        type: 'OpenDialogHandle<T>',
        description:
          'Mounts component inside <Dialog>, rendered by the app-level <DialogHost/>. options.props is typed against the component you pass.',
      },
      {
        name: 'confirmDialog(options)',
        type: 'OpenDialogHandle<boolean>',
        description:
          'title + description + Cancel/Confirm footer, built on openDialog. onConfirm is awaited before closing; a rejection leaves the dialog open and fires onError.',
      },
      {
        name: 'useDialogRef()',
        type: 'DialogRef<D, T>',
        description:
          'Called from inside the opened component. { data, panelEl, close(result) } — close() is what settles the opener’s result promise.',
      },
      {
        name: 'useDialogQueue()',
        type: 'DynamicDialogEntry[]',
        description:
          'The live queue <DialogHost/> renders — mount DialogHost once at the app root.',
      },
    ],
  },

  useToast: {
    description:
      'Sonner-style imperative toasts — call `toast(title, options)` from anywhere, no component context needed. `toast.success/error/warning/info/loading` are shortcuts for each variant, and `toast.promise(input, messages)` shows a loading toast immediately and swaps it for success/error once the promise settles, with no manual dismiss() bookkeeping. Requires a `<Toaster/>` mounted once at the app root to actually render.',
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
          'Read-only queue access plus pause/resume — what <Toaster/> itself uses internally (e.g. pausing timers on pointerenter).',
      },
    ],
  },

  useAsyncLoading: {
    description:
      'Tracks every in-flight promise passed to `run()` — `loading` only clears once ALL of them have settled, so overlapping calls (or several buttons sharing one instance) never flicker the state early. This is exactly what `Button`’s own `loading="auto"` uses internally for promise-returning `@click` handlers.',
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
      "Locale-aware number formatting and parsing, both directions kept perfectly in sync — `format` turns a number into the full localized+affixed display string, `parse` turns typed text back into a number (or `null` for anything incomplete or invalid), and `isPartial` tells a legal mid-typing state ('', '-', '1.') apart from actual garbage so you don’t fight the user while they’re still typing. This is exactly what `InputNumber` uses internally for its own currency/percent/decimal modes.",
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
          'Literal affix Intl has no concept of (e.g. a unit label) — stripped on parse, appended on format.',
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
          'null for anything that isn’t a complete, unambiguous number — including legal in-progress typing states.',
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
      'Drives `document.documentElement.dataset.theme` from a `system` / `light` / `dark` mode — `system` removes the attribute entirely and follows `prefers-color-scheme` live. This is the exact composable the docs site’s own header theme toggle uses; `persist` is structural (like ConfigProvider’s `i18n`) so you can wire in cookies, a store, or localStorage yourself instead of the composable assuming one.',
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

// mode.value: 'system' | 'light' | 'dark' — what the user picked
// resolvedMode.value: 'light' | 'dark' — what's actually applied right now
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
          'Structural persistence hook — no default, nothing is persisted unless you pass this.',
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
        description: "What's actually applied — resolves 'system' against the live media query.",
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
      'The Floating UI-backed positioning engine behind `Popover`, `Menu`, and `Tooltip` — computes `positionerStyle` (absolute inset + `visibility`) against a reference/floating element pair, with flip/shift collision handling and live `autoUpdate` tracking while `active` is true. Reach for this directly when building a custom anchored surface none of the existing overlay components fit.',
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
      'Windowed rendering for long lists — only the visible rows (plus overscan) exist in the DOM. This is what `Select`/`Combobox`/`Tree` reach for once their list gets large; use it directly when building a custom scrollable list that needs the same treatment.',
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
        description: 'Fires once the rendered window nears count - 1 — re-arms when count changes.',
      },
    ],
    returns: [
      {
        name: 'listStyle',
        type: 'Ref<Record<string, string>>',
        description:
          'Bind to a relative, full-height spacer — gives the container real scrollable height.',
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
          "Default 'nearest' — what keyboard nav wants: never move a row that's already visible.",
      },
      {
        name: 'measuredSize',
        type: 'Readonly<Ref<number | null>>',
        description: 'The resolved per-row size.',
      },
    ],
  },

  useFieldControl: {
    description:
      'Wires a custom form control into the nearest `<Field>` — id/label association, `aria-describedby`/`aria-invalid`/`aria-required`, and reporting focus/filled state so Field can move a floating label or flip `data-filled`. This is what every built-in input (Input, Select, Checkbox, RadioGroup, …) uses internally; reach for it directly when building a custom control that should plug into Field the same way.',
    hasLiveDemo: true,
    params: [
      {
        name: 'filled',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          'Reactive "does this control currently have a value" signal — reported to the nearest Field, including programmatic v-model writes.',
      },
    ],
    returns: [
      {
        name: 'id',
        type: 'string',
        description:
          "Bind to the control's own id — Field's controlId when present, otherwise a fresh useId().",
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
        description: "Advisory — OR into the control's own disabled prop.",
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
