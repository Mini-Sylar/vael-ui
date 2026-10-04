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
      "Opens a confirm flow with one function call. It's centered by default (`surface: 'dialog'`), or anchored to a trigger with `surface: 'popover'`, which requires `triggerEl`. TypeScript offers the options that match the `surface` you pick. `onConfirm` is awaited: the confirm button shows its loading state until it settles, and the surface closes only on success. If `onConfirm` rejects, the surface stays open and `onError` fires. `confirmAction` isn't a new component. It wraps `openDialog` and `openPopover`, which you can still use for anything it doesn't cover.",
    hasLiveDemo: true,
    params: [
      { name: 'title', type: 'string', description: 'Required for both surfaces.' },
      { name: 'description', type: 'string', description: '' },
      {
        name: 'confirmLabel / cancelLabel',
        type: 'string',
        description: "Default `'Confirm'` / `'Cancel'`.",
      },
      {
        name: 'variant',
        type: 'ButtonVariant',
        description:
          "Confirm button style. Default `'primary'`. Use `'danger'` for destructive actions.",
      },
      {
        name: 'onConfirm',
        type: '() => unknown | Promise<unknown>',
        description: 'Awaited before the surface closes.',
      },
      { name: 'onCancel', type: '() => void', description: '' },
      {
        name: 'onError',
        type: '(error: unknown) => void',
        description: 'Fires when `onConfirm` rejects.',
      },
      {
        name: 'confirmButtonProps / cancelButtonProps',
        type: 'Partial<ButtonProps>',
        description: 'Passes any Button prop, beyond the label and variant shortcuts.',
      },
      {
        name: 'body / bodyProps',
        type: 'Component / Record<string, unknown>',
        description:
          'Extra content between the description and the buttons, such as a "type DELETE" input.',
      },
      {
        name: 'surface',
        type: "'dialog' | 'popover'",
        description: "Default `'dialog'`.",
      },
      {
        name: 'position / size',
        type: 'DialogPosition / DialogSize',
        description: "Only with `surface: 'dialog'`. Same as Dialog's own props.",
      },
      {
        name: 'triggerEl',
        type: 'TriggerRef',
        description:
          "Only with `surface: 'popover'`, where it's required. Same contract as `openPopover`'s `triggerEl`.",
      },
      {
        name: 'side / align / sideOffset / …',
        type: 'PopoverProps',
        description: "Only with `surface: 'popover'`. Any other Popover prop, passed through.",
      },
    ],
    returns: [
      {
        name: 'result',
        type: 'Promise<boolean | undefined>',
        description:
          '`true` on confirm, `false` on cancel, `undefined` when dismissed with Escape or an outside click.',
      },
      {
        name: 'close',
        type: '(result?: boolean) => void',
        description: "Closes the surface from the opener's side.",
      },
      {
        name: 'panelEl',
        type: '{ readonly value: HTMLElement | null }',
        description:
          '`null` until the surface mounts. Use it for GSAP or motion-v enter animations.',
      },
    ],
  },

  useDialogService: {
    description:
      'Opens dialogs from code instead of markup, on the same engine as `<Dialog>`. `openDialog(Component, options)` mounts any component as the dialog body, with typed props. It returns a `result` promise that settles with the value the opened component passes to `useDialogRef().close(result)`. `confirmAction()` is built on it. Use it directly for anything beyond a plain confirm, such as a rename form or a multi-step flow.',
    installNames: ['openDialog', 'useDialogRef', 'useDialogQueue'],
    hasLiveDemo: true,
    extraSourceFiles: ['RenameFileDialogBody.vue', 'DeleteFileDialogBody.vue'],
    params: [],
    returns: [
      {
        name: 'openDialog(component, options)',
        type: 'OpenDialogHandle<T>',
        description:
          'Mounts `component` inside `<Dialog>`, rendered by the app-level `<DialogHost/>`. `options.props` is typed against the component you pass.',
      },
      {
        name: 'useDialogRef()',
        type: 'DialogRef<D, T>',
        description:
          "Call it inside the opened component. Returns `{ data, panelEl, close(result) }`. Calling `close()` settles the opener's `result` promise.",
      },
      {
        name: 'useDialogQueue()',
        type: 'DynamicDialogEntry[]',
        description:
          'The live queue that `<DialogHost/>` renders. Mount `DialogHost` once at the app root.',
      },
    ],
  },

  usePopoverService: {
    description:
      "Opens anchored popovers from code instead of markup, on the same engine as `<Popover>`. `openPopover(Component, options)` mounts any component inside a Popover anchored to `options.triggerEl`. `triggerEl` is required, because an imperative popover has no `#trigger` slot to anchor to. It returns a `result` promise that settles with the value the opened component passes to `usePopoverRef().close(result)`. `confirmAction({ surface: 'popover' })` is built on it. Use it directly for anything beyond a plain confirm.",
    installNames: ['openPopover', 'usePopoverRef', 'usePopoverQueue'],
    hasLiveDemo: true,
    extraSourceFiles: ['RemoveTagPopoverBody.vue'],
    params: [],
    returns: [
      {
        name: 'openPopover(component, options)',
        type: 'OpenPopoverHandle<T>',
        description:
          'Mounts `component` inside `<Popover>`, rendered by the app-level `<PopoverHost/>`. `options.props` is typed against the component you pass. `options.triggerEl` is required.',
      },
      {
        name: 'usePopoverRef()',
        type: 'PopoverRef<D, T>',
        description:
          "Call it inside the opened component. Returns `{ data, panelEl, close(result) }`. Calling `close()` settles the opener's `result` promise.",
      },
      {
        name: 'usePopoverQueue()',
        type: 'DynamicPopoverEntry[]',
        description:
          'The live queue that `<PopoverHost/>` renders. Mount `PopoverHost` once at the app root, next to `DialogHost`.',
      },
    ],
  },

  useToast: {
    description:
      "Sonner-style toasts you trigger from code. Call `toast(title, options)` from anywhere, with no component context. `toast.success`, `.error`, `.warning`, `.info` and `.loading` set the variant for you. `toast.promise(input, messages)` shows a loading toast at once, then swaps it for a success or error toast when the promise settles. You don't need to call `dismiss()` yourself. Toasts render in a `<Toaster/>`, which you mount once at the app root.",
    installNames: ['toast', 'useToastQueue'],
    hasLiveDemo: true,
    params: [],
    returns: [
      {
        name: 'toast(title, options?)',
        type: 'number | string',
        description:
          "Shows a toast with the default variant and returns its id for `dismiss(id)`: a number, or your own `id` if you pass one. Options: `id`, `description`, `variant`, `duration` (in milliseconds, default 4000; `Infinity` keeps it until someone closes it), `action: { label, onClick }` and `pinned`, which shows the toast in its own section where newer toasts can't cover it. Showing a toast with an `id` that's already on screen updates that toast instead of adding another.",
      },
      {
        name: 'toast.success / .error / .warning / .info / .loading',
        type: '(title, options?) => number',
        description:
          'Same signature with a fixed variant. `loading` defaults to `duration: Infinity`.',
      },
      {
        name: 'toast.promise(input, messages, options?)',
        type: 'Promise<T>',
        description:
          '`input` is a promise or a function that returns one. Shows `messages.loading` at once, then `messages.success` or `messages.error`. Each can be a string or a function of the settled value or error.',
      },
      {
        name: 'toast.dismiss(id?)',
        type: '(id?: number | string) => void',
        description: 'Dismisses one toast, or every toast when you omit `id`.',
      },
      {
        name: 'useToastQueue()',
        type: '{ toasts, dismiss, pauseAll, resumeAll, setWaiting }',
        description:
          "Read-only queue access, plus pause and resume. `<Toaster/>` uses it internally, for example to pause timers on `pointerenter`. `setWaiting(ids)` holds the timers of toasts that aren't on screen yet.",
      },
    ],
  },

  useTour: {
    description:
      "The headless state machine behind `<Tour>`. It tracks the step index and groups, handles navigation and awaits each step's `onBeforeEnter`. It renders nothing and doesn't touch the DOM. `<Tour>` is `useTour()` plus a spotlight overlay and a `Popover` callout. Use the composable directly to build your own walkthrough UI. For example, you might use a different animation library, a non-floating callout or an embedded panel.",
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
          "Controls the tour's visibility. Setting it to `true` resets to the first step: it awaits that step's `onBeforeEnter`, then fires `onStepChange` with `reason: 'open'`. Setting it to `false` closes the tour without resetting it.",
      },
      {
        name: 'id',
        type: 'string',
        description:
          "Identifies this tour instance. It isn't used internally. It's passed back in every callback's `details`, so a shared handler can tell tours apart when a page has more than one.",
      },
      {
        name: 'steps',
        type: 'MaybeRefOrGetter<readonly TourStep[]>',
        description:
          "Same shape as `<Tour>`'s `steps` prop. Each step has a `target` (a `DOMTarget`), plus optional `title`, `description`, `side`, `align`, `sideOffset`, `alignOffset`, `spotlightPadding`, `spotlightRadius`, `disableInteraction`, `onBeforeEnter` and `group`.",
      },
      {
        name: 'onStepChange',
        type: '(details: TourStepChangeDetails) => void',
        description:
          "Fires after a step change settles, including the first step (`reason: 'open'`). `details` is `{ index, step, reason, previousIndex, previousStep, id }`.",
      },
      {
        name: 'onSkip',
        type: '(details: TourEndDetails) => void',
        description: 'Fires when you call `skip()`. `details` is `{ index, step, id }`.',
      },
      {
        name: 'onFinish',
        type: '(details: TourEndDetails) => void',
        description:
          'Fires when you call `next()` on the last step. `details` is `{ index, step, id }`.',
      },
    ],
    returns: [
      {
        name: 'id',
        type: 'string | undefined',
        description: 'The `options.id` you passed in.',
      },
      { name: 'currentIndex', type: 'Ref<number>', description: '' },
      {
        name: 'currentStep',
        type: 'ComputedRef<TourStep | undefined>',
        description: '',
      },
      {
        name: 'currentGroup',
        type: 'ComputedRef<string | undefined>',
        description: '',
      },
      {
        name: 'groups',
        type: 'ComputedRef<TourGroup[]>',
        description: '`{ group, steps }[]`, grouped in first-seen order.',
      },
      {
        name: 'total / isFirst / isLast',
        type: 'ComputedRef',
        description: '',
      },
      {
        name: 'isTransitioning',
        type: 'Ref<boolean>',
        description:
          "`true` while the next step's `onBeforeEnter` is pending. `currentIndex` doesn't change until it settles, so keep the previous step's UI mounted until then.",
      },
      {
        name: 'next / prev',
        type: '() => Promise<void>',
        description:
          'On the last step, `next()` calls `onFinish` and sets `open.value = false` instead of advancing.',
      },
      {
        name: 'skip',
        type: '() => void',
        description: 'Calls `onSkip` and sets `open.value = false`.',
      },
      {
        name: 'goTo',
        type: '(index: number) => Promise<void>',
        description: '',
      },
      {
        name: 'goToGroup',
        type: '(group: string) => Promise<void>',
        description: "Jumps to the group's first step.",
      },
    ],
  },

  useAsyncLoading: {
    description:
      'Tracks every in-flight promise you pass to `run()`. `loading` stays `true` until all of them settle, so overlapping calls, or several buttons sharing one instance, don\'t make the state flicker. `Button` uses it for `loading="auto"` when an `@click` handler returns a promise.',
    hasLiveDemo: true,
    params: [],
    returns: [
      {
        name: 'loading',
        type: 'ComputedRef<boolean>',
        description: "`true` while at least one `run()` call hasn't settled.",
      },
      {
        name: 'run',
        type: '<T>(fn: () => T | Promise<T>) => Promise<T>',
        description: 'Runs `fn` and counts it as in flight until it settles.',
      },
    ],
  },

  useNumberFormat: {
    description:
      "Formats and parses numbers for a locale, with both directions kept in sync. `format` turns a number into the localized display string, including any affixes. `parse` turns typed text back into a number, or `null` if the text is incomplete or invalid. `isPartial` tells valid in-progress input (`''`, `'-'`, `'1.'`) apart from invalid text, so you don't reject input mid-typing. `InputNumber` uses it for its currency, percent and decimal modes.",
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
        description: "Default `'decimal'`.",
      },
      {
        name: 'currency',
        type: 'MaybeRefOrGetter<string | undefined>',
        description: "ISO code, such as `'USD'`. Defaults to `'USD'` when `mode` is `'currency'`.",
      },
      {
        name: 'minFractionDigits',
        type: 'MaybeRefOrGetter<number | undefined>',
        description: 'Passed to `Intl.NumberFormat` as `minimumFractionDigits`.',
      },
      {
        name: 'maxFractionDigits',
        type: 'MaybeRefOrGetter<number | undefined>',
        description: 'Passed to `Intl.NumberFormat` as `maximumFractionDigits`.',
      },
      {
        name: 'useGrouping',
        type: 'MaybeRefOrGetter<boolean | undefined>',
        description: 'Shows thousands separators. Default `true`.',
      },
      {
        name: 'prefix / suffix',
        type: 'MaybeRefOrGetter<string | undefined>',
        description:
          "A literal affix that `Intl` doesn't handle, such as a unit label. Added on format and stripped on parse.",
      },
    ],
    returns: [
      {
        name: 'format',
        type: '(value: number | null) => string',
        description:
          "Returns `''` for `null` or `NaN`. Otherwise returns the full localized string, including affixes.",
      },
      {
        name: 'parse',
        type: '(text: string) => number | null',
        description:
          "Returns `null` for anything that isn't a complete, unambiguous number, including valid in-progress input.",
      },
      {
        name: 'isPartial',
        type: '(text: string) => boolean',
        description:
          "`true` for valid in-progress input that `parse` returns `null` for. Don't reject this input.",
      },
    ],
  },

  useColorScheme: {
    description:
      "Sets `document.documentElement.dataset.theme` from a `system`, `light` or `dark` mode. In `system` mode it removes the attribute and follows `prefers-color-scheme` as it changes. The docs site's theme toggle uses this composable. `persist` is structural (like ConfigProvider's `i18n`), so you choose the storage: cookies, a store or `localStorage`. The composable applies the saved mode when the component mounts, after the first paint. A returning visitor with a saved `dark` preference sees the light theme briefly, unless you set the attribute before Vue mounts. The end of the example below shows how.",
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
setMode('dark')

// Avoiding a flash of the wrong theme on load
// ---------------------------------------------
// useColorScheme can't run before Vue mounts, so a returning user with a
// saved preference sees the default theme for a frame first. Set the
// attribute synchronously in a blocking <script> in your HTML's <head>,
// before your app's bundle loads — same trick as next-themes/Nuxt color-mode.
// Match whatever persist.get()/set() convention you wired up above.
//
    <script>
       (function () {
         var saved = localStorage.getItem('theme') // your own persist.get()
         if (saved === 'light' || saved === 'dark') {
           document.documentElement.dataset.theme = saved
         }
       })()
     </script>`,
    params: [
      {
        name: 'initial',
        type: "'system' | 'light' | 'dark'",
        description: "The mode to use until `persist.get()` is read on mount. Default `'system'`.",
      },
      {
        name: 'persist',
        type: '{ get: () => string | null; set: (mode) => void }',
        description:
          "Structural persistence hook. No default: nothing is saved unless you pass it. `set` receives `null` for `'system'`.",
      },
    ],
    returns: [
      {
        name: 'mode',
        type: "ShallowRef<'system' | 'light' | 'dark'>",
        description: 'The selected mode.',
      },
      {
        name: 'resolvedMode',
        type: "ShallowRef<'light' | 'dark'>",
        description: "The applied theme. Resolves `'system'` against the live media query.",
      },
      {
        name: 'setMode',
        type: '(mode) => void',
        description: 'Sets the mode, persists it and applies it.',
      },
    ],
  },

  useFloatingPosition: {
    description:
      'The positioning engine behind `Popover`, `Menu` and `Tooltip`, built on Floating UI. It computes `positionerStyle` (absolute `top` and `left`, plus `visibility`) for a reference and floating element pair. It flips and shifts to avoid collisions, and tracks changes with `autoUpdate` while `active` is `true`. Use it directly to build a custom anchored surface that no existing overlay component fits.',
    hasLiveDemo: true,
    params: [
      {
        name: 'referenceEl',
        type: 'Ref<HTMLElement | null>',
        description: 'The anchor element.',
      },
      {
        name: 'floatingEl',
        type: 'Ref<HTMLElement | null>',
        description: 'The positioned surface.',
      },
      {
        name: 'active',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          'Positioning and `autoUpdate` scroll and resize tracking run only while this is `true`.',
      },
      {
        name: 'side',
        type: 'MaybeRefOrGetter<Side>',
        description: "Default `'bottom'`.",
      },
      {
        name: 'align',
        type: "MaybeRefOrGetter<'start' | 'center' | 'end'>",
        description: "Default `'center'`.",
      },
      {
        name: 'sideOffset',
        type: 'MaybeRefOrGetter<number>',
        description: 'Gap from the reference, along `side`. Default `8`.',
      },
      {
        name: 'alignOffset',
        type: 'MaybeRefOrGetter<number>',
        description: 'Shift along the alignment axis. Default `0`.',
      },
      {
        name: 'matchReferenceWidth',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          "Writes the reference's width to `--ui-anchor-inline-size` in `positionerStyle`. Your positioner CSS can read that variable.",
      },
    ],
    returns: [
      {
        name: 'positionerStyle',
        type: 'Ref<Record<string, string>>',
        description: 'Bind it directly: `:style="positionerStyle"`.',
      },
      {
        name: 'placement',
        type: 'Ref<Placement>',
        description: 'The resolved placement, after flipping.',
      },
      {
        name: 'transformOrigin',
        type: 'Ref<string>',
        description:
          'Matches the resolved placement, so scale and fade animations start at the anchor.',
      },
      {
        name: 'maxHeight',
        type: 'Ref<number | null>',
        description: 'The available height for the surface, or `null` while inactive.',
      },
      {
        name: 'update',
        type: '() => Promise<void>',
        description: 'Forces a recompute outside the normal `autoUpdate` triggers.',
      },
    ],
  },

  useVirtualizer: {
    description:
      'Renders only the visible rows of a long list, plus a few extra rows past each edge (overscan). `Select`, `Combobox` and `DataTable` use it for large lists. Use it directly to give a custom scrollable list the same treatment.',
    hasLiveDemo: true,
    params: [
      {
        name: 'containerEl',
        type: 'Ref<HTMLElement | null>',
        description: 'The scroll container.',
      },
      {
        name: 'count',
        type: 'MaybeRefOrGetter<number>',
        description: 'Total number of rows.',
      },
      {
        name: 'itemSize',
        type: 'MaybeRefOrGetter<number | undefined>',
        description:
          'Row size in px. Omit it to measure the first rendered row, with a 36 px estimate until then.',
      },
      {
        name: 'overscan',
        type: 'MaybeRefOrGetter<number>',
        description: 'Extra rows rendered past each edge. Default `8`.',
      },
      {
        name: 'onReachEnd',
        type: '() => void',
        description:
          "Fires once when the rendered window's last index reaches `count - 1 - overscan`. Fires again after `count` changes.",
      },
    ],
    returns: [
      {
        name: 'listStyle',
        type: 'Ref<Record<string, string>>',
        description:
          'Bind it to a relatively positioned spacer inside the container. It gives the container its full scroll height.',
      },
      {
        name: 'items',
        type: 'Readonly<Ref<VirtualRow[]>>',
        description: 'The rows to render now: `{ index, start, size, style }`.',
      },
      {
        name: 'scrollToIndex',
        type: "(index, align?: 'nearest' | 'start' | 'end' | 'center') => void",
        description:
          "Default `'nearest'`, which suits keyboard navigation: it doesn't scroll when the row is already visible.",
      },
      {
        name: 'measuredSize',
        type: 'Readonly<Ref<number | null>>',
        description: 'The resolved row size.',
      },
    ],
  },

  useSortable: {
    description:
      "The spring-driven drag-to-reorder engine behind `<Sortable>`, nested reordering in `<Tree>` and column reordering in `<DataTable>`. Pointer and keyboard input drive the same grabbed state. Pure, separately tested functions make every ordering and nesting decision. `<Sortable>` is an optional wrapper around it. Use the composable directly when you need markup a component can't give you. To move items between lists, use `useSortableGroup()`, which wraps the same engine.",
    hasLiveDemo: true,
    params: [
      {
        name: 'rows',
        type: 'MaybeRefOrGetter<readonly FlatSortableRow[]>',
        description:
          'Visible rows in visual order, as `{ value, depth, parentValue }`. Read again each time a row is grabbed.',
      },
      {
        name: 'getElement',
        type: '(value) => HTMLElement | null',
        description:
          'Returns the DOM node for a row. The engine measures and moves that node directly.',
      },
      {
        name: 'onCommit',
        type: '(value, to: DropPosition) => void',
        description: 'Applies the reorder. Fires once, on a committed drop.',
      },
      {
        name: 'axis',
        type: "MaybeRefOrGetter<'y' | 'x'>",
        description: "Default `'y'`. Nesting only works on `'y'`.",
      },
      {
        name: 'nested',
        type: 'MaybeRefOrGetter<boolean>',
        description: 'Enables depth changes. `Tree` turns it on; a flat list leaves it off.',
      },
      {
        name: 'dropOnTarget',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          'VS Code-style drops: hovering the middle of a row drops the item into it. Requires `nested`.',
      },
      {
        name: 'reorderSiblings',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          '`false` turns off reordering among current siblings. Only re-parenting is offered, and no indicator shows for a sibling insert. Requires `dropOnTarget`.',
      },
      {
        name: 'nestEdgeFraction',
        type: 'MaybeRefOrGetter<number>',
        description:
          'The fraction of a target\'s size, at each end, that means "beside it" rather than "into it". Default `0.25`, which leaves a 50% inside zone. Lower it for targets that are hard to hit.',
      },
      {
        name: 'canNestInto',
        type: '(value) => boolean',
        description: 'Which rows accept children. Without it, every row does.',
      },
      {
        name: 'childCountOf',
        type: '(value) => number',
        description: 'Existing child count, so an "inside" drop appends to the end.',
      },
      {
        name: 'dragPreview',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          'Lifts the grabbed row into a floating preview that follows the cursor, and dims its slot. Without it, the row stays in the layout and slides past its neighbours.',
      },
      {
        name: 'previewMode',
        type: "MaybeRefOrGetter<'element' | 'clone'>",
        description:
          "`'element'` lifts the real row, so only one copy is on screen. `'clone'` shows a separate floating copy and hides the real row until the drop. Use `'clone'` when the real element can't leave its layout, such as a `<tr>` or `<th>`. The default depends on context: `'element'` once a `group` drag leaves this list, `'clone'` for a plain `dragPreview` drag.",
      },
      {
        name: 'previewCarriesSubtree',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          "Only with `dragPreview` and `nested`. Default `true`. The dragged row's visible descendants (an expanded folder, a tab group) travel inside the floating clone at their current offsets. The whole block lifts as one piece.",
      },
      {
        name: 'disabled',
        type: 'MaybeRefOrGetter<boolean>',
        description: 'Turns off dragging.',
      },
      {
        name: 'motionCss',
        type: 'MaybeRefOrGetter<boolean>',
        description: '`false` turns off the built-in springs, so positions snap.',
      },
      {
        name: 'canDrop',
        type: '(details: SortableDropDetails) => boolean',
        description:
          'A synchronous veto, re-run while dragging. Returning `false` marks the target invalid and blocks the drop. Keep it cheap.',
      },
      {
        name: 'beforeDrop',
        type: '(details) => boolean | Promise<boolean>',
        description:
          'An async check at drop time. Return `false`, or a promise of `false`, to cancel and spring the item back. Works with `confirmAction().result`.',
      },
      {
        name: 'onDropError',
        type: '(error, details) => void',
        description:
          '`beforeDrop` threw or rejected. The move is already reverted when this fires.',
      },
      {
        name: 'labelOf / announce',
        type: '(value) => string / (event) => string',
        description: 'The row label and live-region text for assistive tech.',
      },
      {
        name: 'group / groupId / container',
        type: 'SortableGroupHandle / string | number / MaybeRefOrGetter<HTMLElement | null>',
        description:
          'Shares drag sessions with other `useSortable()` lists that get the same handle. See `useSortableGroup()`. `container` is only needed with `group`, so an empty list can be hit-tested.',
      },
    ],
    returns: [
      {
        name: 'activeValue / isGrabbed / isDragging',
        type: 'Ref',
        description:
          "The held row and how it's held. `isDragging` is pointer-only and stays `false` for a plain click.",
      },
      {
        name: 'isGrabbedValue',
        type: '(value) => boolean',
        description:
          'Bind it directly: `:data-grabbed="isGrabbedValue(row.value) || undefined"`. `true` for a folder\'s whole dragged subtree, not only the grabbed row.',
      },
      {
        name: 'dropPosition / isValidDrop / isPending',
        type: 'Ref',
        description:
          'Where the item would land, whether `canDrop` allows it, and whether an async `beforeDrop` is still pending.',
      },
      {
        name: 'dropIntoValue / dropTargetValue / dropIntent',
        type: 'Ref',
        description:
          'Drop-on-target mode only: the hovered row, and whether the drop goes before, after or inside it.',
      },
      {
        name: 'draggedValues',
        type: 'Ref<ReadonlySet>',
        description: 'Every value in the dragged block. A folder carries its descendants.',
      },
      {
        name: 'isForeignDropTarget',
        type: 'Ref<boolean>',
        description:
          'Only with `group`. `true` while a drag from another list in the group hovers this list. Always `false` for the list the drag started in. Use it to style drop-target feedback.',
      },
      {
        name: 'announcement',
        type: 'Ref<string>',
        description: 'Live-region text. Render it in an `aria-live="assertive"` element.',
      },
      {
        name: 'onHandlePointerdown / onHandleKeydown',
        type: '(event, value) => void',
        description: "Bind these to a row's handle element.",
      },
      {
        name: 'consumeSuppressedClick',
        type: '() => boolean',
        description:
          'Returns `true` once after a committed drag. Use it to ignore the click that follows the drag.',
      },
      {
        name: 'cancel',
        type: '() => void',
        description: 'Abandons the current grab and springs everything back.',
      },
    ],
  },

  useSortableGroup: {
    description:
      'Moves items between lists: the building block for a Kanban-style board, not a component. `<Sortable>`, `<Tree>`, column reordering in `<DataTable>` and `v-draggable` all reorder within one list. This lets an item move from one `useSortable()` list into another, on the same spring-driven engine. Each list still calls `useSortable()`, or uses `<Sortable>` with the same `group` and `groupId` props. The group decides which list shows the open gap, and runs the transfer on drop. The list where the drag started keeps the pointer or keyboard gesture until the drag ends.',
    hasLiveDemo: true,
    params: [
      {
        name: 'onTransfer',
        type: '(value, from: GroupDropPosition, to: GroupDropPosition) => void',
        description:
          "Required. Fires once, on a committed drop into another list. Remove `value` from the array for `from.groupId` and insert it into the array for `to.groupId`. It lives on the group, not on each list, because a move between lists isn't either list's decision.",
      },
      {
        name: 'canDrop',
        type: '(details: GroupDropDetails) => boolean',
        description:
          'Vetoes a move between lists while dragging, such as a WIP limit on the target column. It re-runs live, so keep it cheap.',
      },
      {
        name: 'beforeDrop',
        type: '(details: GroupDropDetails) => boolean | Promise<boolean>',
        description:
          "An async check at drop time. Return `false`, or a promise of `false`, to cancel and spring the item back. Works with `confirmAction().result`, like `useSortable`'s `beforeDrop`.",
      },
      {
        name: 'onDropError',
        type: '(error: unknown, details: GroupDropDetails) => void',
        description:
          '`beforeDrop` threw or rejected. The move is already reverted when this fires.',
      },
      {
        name: 'motionCss',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          '`false` turns off the springs for the gap that opens in another list while you hover it.',
      },
    ],
    returns: [
      {
        name: 'join(options)',
        type: 'UseSortableReturn',
        description:
          'The usual way to add a list: `useSortable()` with `group` and `groupId` already set, so each column is one call. `groupId` is auto-assigned if you omit it. Pass your own so `onTransfer` knows which array to update.',
      },
    ],
  },

  useFieldControl: {
    description:
      'Connects a custom form control to the nearest `<Field>`. It returns the id and the ARIA values to bind (`aria-describedby`, `aria-invalid`, `aria-required`), and reports focus and filled state to Field. Field uses that state to move a floating label and set `data-filled`. Every built-in input (Input, Select, Checkbox, RadioGroup, …) uses it. Use it so a custom control works with Field the same way.',
    hasLiveDemo: true,
    params: [
      {
        name: 'filled',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          '`true` when the control has a value. Reported to the nearest Field, including programmatic `v-model` writes.',
      },
    ],
    returns: [
      {
        name: 'id',
        type: 'string',
        description:
          "Bind to the control's `id`. It's Field's `controlId` when there is one, otherwise a new `useId()`.",
      },
      {
        name: 'describedBy',
        type: '() => string | undefined',
        description: 'Bind to `aria-describedby`.',
      },
      {
        name: 'labelledBy',
        type: '() => string | undefined',
        description:
          'Bind to `aria-labelledby` on group controls (RadioGroup) that have no single native input.',
      },
      {
        name: 'invalid',
        type: '() => boolean',
        description: "OR it into the control's own `invalid` prop.",
      },
      {
        name: 'required',
        type: '() => boolean',
        description: 'Bind to `aria-required`.',
      },
      {
        name: 'disabled',
        type: '() => boolean',
        description: "Advisory. OR it into the control's own `disabled` prop.",
      },
      {
        name: 'onFocus',
        type: '() => void',
        description: "Call it from the control's native `focus` handler.",
      },
      {
        name: 'onBlur',
        type: '() => void',
        description: "Call it from the control's native `blur` handler.",
      },
    ],
  },
}
