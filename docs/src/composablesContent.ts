import type { MetaRow } from './types'
import { appearanceHeadCode } from './appearanceHeadCode'

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
  /** Optional script that must run in the HTML head before Vue loads. */
  headCode?: string
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
          'Mounts `component` inside `<Dialog>`, rendered by the app-level `<DialogHost/>`. `options.props` is typed against the component you pass. The handle has `result`, `close`, and the `panelEl` and `overlayEl` refs for your own animations.',
      },
      {
        name: 'useDialogRef()',
        type: 'DialogRef<D, T>',
        description:
          "Call it inside the opened component. Returns `{ data, panelEl, overlayEl, close(result) }`. Calling `close()` settles the opener's `result` promise.",
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
          "Shows a toast with the default variant and returns its id for `dismiss(id)`: a number, or your own `id` if you pass one. Options: `id`, `description`, `variant`, `duration` (in milliseconds, default 4000; `Infinity` keeps it until someone closes it), `action: { label, onClick }` `pinned`, which shows the toast in its own section where newer toasts can't cover it, and `toaster`, which sends it to the `<Toaster>` with that `name` instead of the unnamed one. Showing a toast with an `id` that's already on screen updates that toast instead of adding another.",
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
        name: 'useToastQueue(toaster?)',
        type: '{ toasts, dismiss, pauseAll, resumeAll, setWaiting }',
        description:
          "Read-only access to one Toaster's queue, plus pause and resume: the unnamed one, or the one whose `name` you pass. `<Toaster/>` uses it internally, for example to pause timers on `pointerenter`. `setWaiting(ids)` holds the timers of toasts that aren't on screen yet.",
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

  preventFocusZoom: {
    description:
      "iOS zooms the page when you focus a form field with text under 16px. vael-ui's fields follow your font size, so at 14px they would trigger it. Call `preventFocusZoom()` once and fields keep your size on iPhone without the zoom. It adds `maximum-scale=1` to the viewport on iOS only, where pinch-to-zoom keeps working. Android and desktop never focus-zoom, so it leaves them alone. If you'd rather have bigger fields on phones than change the viewport, set `--ui-touch-font-size: 16px` instead.",
    exampleCode: `// main.ts
import { preventFocusZoom } from 'vael-ui'

preventFocusZoom()`,
    params: [],
    returns: [
      {
        name: 'changed',
        type: 'boolean',
        description: '`true` on iOS, where it set the viewport. `false` elsewhere, and during SSR.',
      },
    ],
  },

  useHaptic: {
    hasLiveDemo: true,
    description:
      "Haptic feedback on phones that offer it: `navigator.vibrate` on Android, and on iOS (Safari 17.4+) the tick a native switch plays. Desktops do nothing, and `isSupported` tells you which you have. `selection()` is the lightest tick, for a choice changing; `impact('light' | 'medium' | 'heavy')` is a bump, heavier for bigger moments; `notification('success' | 'warning' | 'error')` plays a short pattern for an outcome; `vibrate(pattern)` plays your own. `intensity` scales every pulse. `ConfigProvider`'s `haptics` sets it app-wide: `false` silences every call, yours included, which suits a \"turn off haptics\" setting; `true` or `{ intensity }` also turns on vael-ui's own components. Call it from a user gesture, and keep it for moments that commit something.",
    exampleCode: `import { useHaptic } from 'vael-ui'

const haptic = useHaptic({ intensity: 1.5 })

function onSave() {
  save()
  haptic.notification('success')
}

// App-wide, in your root:
// <ConfigProvider :haptics="{ intensity: 1.2 }"> or :haptics="userWantsHaptics"`,
    params: [
      {
        name: 'intensity',
        type: 'number',
        description:
          "Scales every pulse: `0.5` is softer, `2` stronger. Multiplies with ConfigProvider's `haptics.intensity`. On Android it lengthens each pulse; iOS plays one fixed-strength tick per pulse. Default `1`.",
      },
    ],
    returns: [
      { name: 'isSupported', type: 'boolean', description: 'Whether this device plays haptics.' },
      {
        name: 'selection',
        type: '() => void',
        description: 'The lightest tick, for a choice changing.',
      },
      {
        name: 'impact',
        type: "(weight?: 'light' | 'medium' | 'heavy') => void",
        description: "A bump. Default `'medium'`.",
      },
      {
        name: 'notification',
        type: "(type: 'success' | 'warning' | 'error') => void",
        description: 'A short pattern for an outcome.',
      },
      {
        name: 'vibrate',
        type: '(pattern: number | number[]) => void',
        description:
          'Your own pattern in ms, vibration and pause alternating. iOS plays a tick per pulse.',
      },
    ],
  },

  springEasing: {
    description:
      'Turns a spring into a CSS `linear()` curve and the time it takes to settle, in ms. It\'s the curve vael-ui uses for `ConfigProvider`\'s `:motion="{ spring }"`. The result has the same shape as the options `element.animate()` takes, so your own animations can move on the same spring without a library. Damping below 1 overshoots.',
    exampleCode: `import { springEasing } from 'vael-ui'

// { easing: 'linear(0, …, 1)', duration: 642 }
const spring = springEasing({ damping: 0.7, response: 0.4 })

panel.animate([{ opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1 }], spring)

// Or in CSS
el.style.transition = \`transform \${spring.duration}ms \${spring.easing}\``,
    params: [
      {
        name: 'spring',
        type: '{ damping?: number; response?: number }',
        description:
          'Damping 1 settles without overshoot; below 1 it bounces. Response is roughly the time to arrive, in seconds.',
      },
    ],
    returns: [
      {
        name: 'easing',
        type: 'string',
        description: 'A CSS `linear()` easing that follows the spring.',
      },
      {
        name: 'duration',
        type: 'number',
        description: 'How long the spring takes to settle, in ms.',
      },
    ],
  },

  useColorScheme: {
    hasLiveDemo: true,
    description:
      "`useColorScheme` sets the root `data-theme` to `light` or `dark`; `system` follows the OS preference. Pass `persist` to save the choice in cookies, a store, or `localStorage`. Vue restores saved choices on mount, which can occur after first paint. The HTML head example restores color mode and an optional root font size before paint. Pass `{ from: event }` as the second argument to `setMode` and the new scheme spreads in a circle from the click, as the example below and this site's header toggle do. Every call in the browser shares one state, so two toggles never disagree. It uses a View Transition; browsers without one, and reduced motion, switch at once.",
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

// mode.value: 'system' | 'light' | 'dark'
// resolvedMode.value: 'light' | 'dark'
// From your theme toggle, spreading from the click:
// <button @click="(e) => setMode(resolvedMode === 'dark' ? 'light' : 'dark', { from: e })">`,
    headCode: appearanceHeadCode,
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
        type: '(mode, reveal?: { from: Event | Element | { x, y }; duration?; easing? }) => void',
        description:
          'Sets the mode, persists it and applies it. With `reveal`, the new scheme spreads in a circle from `from`: a click, an element, or a point. `duration` defaults to 500 ms.',
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

  useSpringValue: {
    description:
      "vael-ui's spring engine: the physics behind Sortable, Tree and DataTable reordering, and behind every sliding indicator set to spring mode. A spring has no duration. You give it a target, and it moves there from where it is now, at the speed it already has. That makes every animation interruptible: call `set()` mid-flight and the value turns toward the new target with no jump. `useSpringValue` gives you a ref to bind in a template. `createSpring` writes each frame through a callback instead, so a value that drives a style never re-renders a component. `stepSpring` is the pure integrator step under both, for tests and plots. One shared `requestAnimationFrame` loop drives every moving spring, and it stops scheduling frames once they all rest.",
    installNames: ['useSpringValue', 'createSpring', 'stepSpring'],
    hasLiveDemo: true,
    params: [
      {
        name: 'initial',
        type: 'number',
        description: 'The starting value. The spring rests there until you call `set()`.',
      },
      {
        name: 'options.damping',
        type: 'number',
        description:
          'Default `1`, critically damped: the value reaches the target with no overshoot. Below `1` it overshoots and oscillates, more the lower you go. Above `1` it creeps in more slowly. Save overshoot for motion the user threw, such as a flick release, not for something that only appeared.',
      },
      {
        name: 'options.response',
        type: 'number',
        description:
          'Default `0.35`, in seconds. Sets how quickly the spring converges, not how long it runs: it is the period of the undamped oscillation. The real settle time comes out of the physics, from the distance, the speed and the damping. Lower is snappier.',
      },
      {
        name: 'options.epsilon',
        type: 'number',
        description:
          'Default `0.05`. Once the distance to the target and the speed per second are both below this, the spring lands on the target and stops. The default suits px. Lower it for a value on a 0 to 1 scale, such as opacity, where 0.05 is a visible step.',
      },
      {
        name: 'onFrame',
        type: '(value: number) => void',
        description:
          '`createSpring` only. Called with the new value on every frame, on `jump()`, and on a `set()` that is already at rest on the target. Write the value straight to a style here.',
      },
    ],
    returns: [
      {
        name: 'value',
        type: 'Ref<number>',
        description:
          '`useSpringValue` only. The live value, updated every frame. Read it, and drive it with `set()` and `jump()` rather than assigning to it.',
      },
      {
        name: 'set(target, { velocity? })',
        type: '(target: number, options?: { velocity?: number }) => void',
        description:
          "Retargets from the current value and velocity, never from the previous target, so an interrupted spring turns smoothly. Pass `velocity`, in units per second, to hand off a gesture's release speed: the animation starts at the speed the drag ended with, so there is no seam.",
      },
      {
        name: 'jump(value)',
        type: '(value: number) => void',
        description:
          'Moves to `value` at once, with zero velocity. Use it for the first placement, while a drag follows the pointer, and under reduced motion.',
      },
      {
        name: 'stop()',
        type: '() => void',
        description:
          'Parks the spring where it is now and drops the remaining motion. The current value becomes the target.',
      },
      {
        name: 'createSpring(initial, options?, onFrame?)',
        type: 'SpringHandle',
        description:
          'The same spring without a ref. Besides `set`, `jump` and `stop`, the handle has read-only `value`, `velocity`, `target` and `isAnimating`, and `destroy()`, which takes it off the frame loop. Call `destroy()` when you unmount. `useSpringValue` does that for you when its scope ends. Options are read once, so create a new spring to change them.',
      },
      {
        name: 'stepSpring(state, target, dt, damping?, response?)',
        type: 'SpringState',
        description:
          "One semi-implicit Euler step from `{ value, velocity }` over `dt` seconds. Pure, with no frame loop, so you can test or plot a spring with plain numbers. A `dt` of 0 or less returns the state unchanged. The live loop caps each frame at 1/30 s, so a tab returning from the background doesn't fling every spring.",
      },
    ],
  },

  useTabIndicator: {
    description:
      "The sliding selection indicator behind Tabs, SelectButton, Pagination and MenuList, and behind the active option in Select, Combobox and CommandPalette. It measures the active element inside a list and returns a style that places an indicator element on it. When the active element changes, the indicator glides there. `useHoverIndicator` builds the hover highlight on the same measurement. Use it for your own segmented control, nav or list: put the indicator element inside the list, give the list `position: relative`, and bind the `style`. It measures again when the list resizes, when web fonts finish loading, and when an ancestor finishes a CSS transition, such as a dialog scaling in. It also undoes an ancestor's scale, so the px values match the layout.",
    hasLiveDemo: true,
    params: [
      {
        name: 'active',
        type: 'WatchSource<unknown>',
        description:
          'What moves the indicator, such as the selected value. It measures after each change, once the DOM shows it. For a list that also filters, pass a getter of both: `() => [activeIndex.value, items.value]`.',
      },
      {
        name: 'listEl',
        type: 'Ref<HTMLElement | null>',
        description:
          "The list. The indicator element goes inside it, and it is the indicator's containing block. A ResizeObserver on it measures again when its size changes.",
      },
      {
        name: 'orientation',
        type: "MaybeRefOrGetter<'horizontal' | 'vertical'>",
        description:
          "Default `'horizontal'`, which sets the inline position and size. `'vertical'` sets the block position and size.",
      },
      {
        name: 'selector',
        type: 'MaybeRefOrGetter<string>',
        description:
          'Default `\'[role="tab"][aria-selected="true"]\'`. The first match inside `listEl` is the active element. SelectButton uses `\'[data-checked]\'`, and Pagination uses `\'[aria-current="page"]\'`. With no match, the style sets `opacity: 0`.',
      },
      {
        name: 'sizing',
        type: "MaybeRefOrGetter<'bounds' | 'transform'>",
        description:
          "Default `'bounds'`: real position and size in px, so a border radius stays true at any size. `'transform'` uses `translate` and `scale` on a 1 px baseline instead. It is cheaper, but a radius on the scaled axis flattens, and it can look misaligned at fractional pixel ratios. Use it only for an indicator with square ends, such as an underline. `scroller`, `matchCross`, `maxGlide` and a spring need `'bounds'`.",
      },
      {
        name: 'scroller',
        type: 'boolean',
        description:
          '`listEl` scrolls, and the indicator sits inside its scrolled content. Positions include the scroll offset, so the indicator scrolls with the rows.',
      },
      {
        name: 'matchCross',
        type: 'boolean',
        description:
          "Also sets the cross axis from the active element: top and height in a horizontal list, start and width in a vertical one. Use it when rows are inset by the list's padding. Without it, your CSS sets the cross axis.",
      },
      {
        name: 'maxGlide',
        type: 'MaybeRefOrGetter<number | undefined>',
        description:
          "A move longer than this many of the active element's own lengths jumps instead of gliding. That suits typeahead, Home and End, and a filtered list. With it set, a list that loses its match shows the next one in place instead of sliding in. Unset, every move glides.",
      },
      {
        name: 'motion',
        type: 'MaybeRefOrGetter<boolean | undefined>',
        description:
          '`false` moves the indicator at once on every change, so you can animate it yourself. Unset, it moves the way `indicator` says.',
      },
      {
        name: 'indicator',
        type: "MaybeRefOrGetter<'glide' | 'instant' | { damping?: number; response?: number } | undefined>",
        description:
          "How it moves: `'glide'`, a CSS transition, `'instant'`, or a spring (see `useSpringValue`). Unset, it follows the nearest ConfigProvider's `indicator`, else `'glide'`. A spring needs `indicatorEl`. It jumps instead of springing on its first appearance, past `maxGlide`, and under reduced motion.",
      },
      {
        name: 'indicatorEl',
        type: 'Ref<HTMLElement | null>',
        description:
          'The indicator element. A spring writes position and size straight to its inline style each frame, with no re-render.',
      },
    ],
    returns: [
      {
        name: 'style',
        type: 'Ref<Record<string, string | undefined>>',
        description:
          "Bind it on the indicator element. It holds the position and size in px, and `opacity: 0` while nothing matches. On first paint, on first appearance and past `maxGlide`, it sets the position and size durations to `0ms`, so the indicator doesn't grow in from the edge. Those overrides go slot by slot, so list your transition as position, size, then opacity, the order the `ui-indicator` classes use. With a spring, it holds only `transition-property: opacity`.",
      },
    ],
  },

  useScrollLock: {
    description:
      "Locks scrolling on an element, `document.body` by default. Dialog, Drawer, BottomSheet and Tour use it while they are open. It sets `overflow: hidden` and `overscroll-behavior: contain`. It also pads the element's inline end by the scrollbar's width, so the layout doesn't shift when the scrollbar goes. That width is also set as `--ui-scrollbar-width`, on `<html>` for a body lock, so a fixed header can add the same padding. Locks are counted per element: when two dialogs lock the body, it stays locked until both release. On release, the inline styles from before the lock come back, unless something else changed them meanwhile. On iOS, a body lock also blocks touch scrolling, except inside a scrollable region within the body.",
    hasLiveDemo: true,
    params: [
      {
        name: 'target',
        type: 'MaybeRefOrGetter<HTMLElement | null>',
        description:
          'Default `document.body`. When it changes while locked, the lock moves to the new element. `null` releases it.',
      },
      {
        name: 'initial',
        type: 'boolean',
        description: 'Default `false`. `true` locks at once.',
      },
    ],
    returns: [
      {
        name: 'locked',
        type: 'WritableComputedRef<boolean>',
        description:
          'The return value is the ref itself: `const locked = useScrollLock()`. Set it to `true` to lock and `false` to release. The lock also releases when the calling scope ends, such as on unmount.',
      },
    ],
  },

  useHoverIndicator: {
    description:
      'The sliding hover highlight behind every vael-ui list: Select, Menu, Tree, DataTable, Tabs, Pagination, Calendar and the rest. It follows the row under a mouse or pen, or the row with keyboard focus (keyboard always wins), and slides one indicator element between them. Touch is ignored, as hover styles are. Use it to give your own list the same feel: mark the rows with `itemSelector`, put an element with the `ui-indicator` class inside the list, and bind the `style` it returns. The list needs `position: relative; isolation: isolate`, so the indicator sits behind the rows. Style it with `--ui-indicator-bg`, `--ui-duration-indicator` and `--ui-ease-indicator`, or set `motion: false` and drive it yourself.',
    installNames: ['useHoverIndicator'],
    hasLiveDemo: true,
    params: [
      {
        name: 'listEl',
        type: 'Ref<HTMLElement | null>',
        description:
          'The list. The indicator element goes inside it, and moves in its coordinates.',
      },
      {
        name: 'itemSelector',
        type: 'string',
        description: 'Matches the rows the indicator moves between. Disabled rows are skipped.',
      },
      {
        name: 'scope',
        type: 'string',
        description:
          'A row counts only when its nearest match for this is `listEl` itself, so a nested list (a submenu, a table in an expanded row) keeps its own rows.',
      },
      {
        name: 'orientation',
        type: "MaybeRefOrGetter<'vertical' | 'horizontal'>",
        description:
          "Default `'vertical'`. For a row of buttons, use `'horizontal'` with the `ui-indicator--inline` class; for a grid, add `ui-indicator--grid` to glide on both axes.",
      },
      {
        name: 'scroller',
        type: 'boolean',
        description: '`listEl` scrolls, and the indicator scrolls with the rows inside it.',
      },
      {
        name: 'matchCross',
        type: 'boolean',
        description:
          'Default `true`: also matches each row across the list, for rows inset by its padding.',
      },
      {
        name: 'maxGlide',
        type: 'number',
        description: 'Default `3`. A move longer than this many rows jumps instead of gliding.',
      },
      {
        name: 'enabled',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          '`false` hides the indicator and stops tracking, while a row is being dragged, say.',
      },
      {
        name: 'motion',
        type: 'MaybeRefOrGetter<boolean | undefined>',
        description:
          "`false` moves the indicator at once, for an animation of your own. Unset, it follows the nearest ConfigProvider's `motion`.",
      },
      {
        name: 'indicator',
        type: "MaybeRefOrGetter<'glide' | 'instant' | { damping?: number; response?: number } | undefined>",
        description:
          "How it moves: a CSS glide, an instant move, or a spring. Unset, it follows the nearest ConfigProvider's `indicator`, else `'glide'`. See `useTabIndicator`.",
      },
      {
        name: 'indicatorEl',
        type: 'Ref<HTMLElement | null>',
        description:
          'The indicator element. A spring writes to it directly each frame. Without it, a spring falls back to the glide.',
      },
    ],
    returns: [
      {
        name: 'style',
        type: 'Ref<Record<string, string | undefined>>',
        description:
          'Bind it on the indicator element: its position and size in px, and `opacity: 0` while nothing is hovered or focused. The hovered row also carries `data-indicated`.',
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
        name: 'motion',
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
        name: 'motion',
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

  moveTreeNode: {
    description:
      "Moves for a reorderable tree. `moveTreeNode` moves a node and its subtree to a new parent and index, mutating your array in place, the same contract as `removeTreeNode`. Its `to` argument is the `DropPosition` that `useSortable`'s `onCommit` gives you, so the two connect directly. Tree commits its drag reordering through it, and Sortable uses it for flat lists. `isDescendantOf` is the guard it runs first, because dropping a folder into its own descendant would detach that branch and lose it. Nodes are read as `{ value, children }` by default, the shape `TreeNode` and `MenuItemData` already have. Pass accessors for any other shape.",
    installNames: ['moveTreeNode', 'isDescendantOf'],
    exampleCode: `import { ref } from 'vue'
import { isDescendantOf, moveTreeNode } from 'vael-ui'
import type { DropPosition, TreeAccessors } from 'vael-ui'

interface Folder {
  id: number
  name: string
  folders?: Folder[]
}

const tree = ref<Folder[]>([
  { id: 1, name: 'Projects', folders: [{ id: 2, name: 'Drafts' }] },
  { id: 3, name: 'Archive' },
])

const accessors: TreeAccessors<Folder> = {
  getKey: (folder) => folder.id,
  getChildren: (folder) => folder.folders,
  setChildren: (folder, folders) => (folder.folders = folders),
}

// Pass this as useSortable's onCommit, or call it from your own drop handler.
function onCommit(value: string | number, to: DropPosition) {
  moveTreeNode(tree.value, value, to, accessors)
}

// Drafts becomes Archive's first child. Archive had no children array, so one is created.
moveTreeNode(tree.value, 2, { parentValue: 3, index: 0, depth: 1 }, accessors)

isDescendantOf(tree.value, 3, 2, accessors) // true: Drafts is now inside Archive`,
    params: [
      {
        name: 'nodes',
        type: 'T[]',
        description:
          'The top-level array. `moveTreeNode` changes it, and the arrays inside it, in place.',
      },
      {
        name: 'value',
        type: 'string | number',
        description: 'The key of the node to move.',
      },
      {
        name: 'to',
        type: 'DropPosition',
        description:
          "`{ parentValue, index, depth }`. `parentValue` is the new parent's key, or `null` for the top level. `index` is the node's final slot among its new siblings, counted as if the node were already removed, and is clamped to the array. `depth` is not read.",
      },
      {
        name: 'accessors',
        type: 'TreeAccessors<T>',
        description:
          "Optional. `getKey` reads a node's key, `node.value` by default. `getChildren` reads its children, `node.children` by default. `setChildren` attaches a new children array, used when the new parent has none yet. By default it assigns `node.children`.",
      },
    ],
    returns: [
      {
        name: 'moveTreeNode(nodes, value, to, accessors?)',
        type: 'boolean',
        description:
          "`true` when the node moved. `false` when nothing moved: the node or the parent wasn't found, or the parent is the node itself or inside its subtree. Check it before you emit or save anything.",
      },
      {
        name: 'isDescendantOf(nodes, ancestorValue, candidateValue, accessors?)',
        type: 'boolean',
        description:
          '`true` when `candidateValue` is anywhere under `ancestorValue`. A node is not its own descendant. Use it to guard a drop handler of your own.',
      },
    ],
  },

  useFileDrop: {
    description:
      "The drag-and-drop half of FileUpload. It makes any element a drop target for files from the desktop, tracks whether a drag is over it, and hands you the dropped files. It counts nested `dragenter` and `dragleave` events, so moving over a child element doesn't flicker the state. It doesn't validate anything: check type, size and count yourself, as FileUpload does with `accept`, `maxSize` and `maxFiles`. It doesn't open a file picker either. Pair it with an `<input type=\"file\">` for keyboard and touch users, who can't drag files.",
    hasLiveDemo: true,
    params: [
      {
        name: 'targetEl',
        type: 'Ref<HTMLElement | null>',
        description: 'The drop target. The listeners follow it when the ref changes.',
      },
      {
        name: 'onFiles',
        type: '(files: File[]) => void',
        description:
          'Called on a drop with every dropped file. A drop with no files, such as dragged text, does not call it.',
      },
      {
        name: 'disabled',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          'Ignores every drag event while `true`. The browser then handles a drop itself, which usually opens the file in the tab.',
      },
    ],
    returns: [
      {
        name: 'isDragOver',
        type: 'Ref<boolean>',
        description:
          'True while a drag carrying files is over the target. Other drags, such as selected text, are ignored, and turning `disabled` on clears it.',
      },
    ],
  },

  useFieldControl: {
    description:
      'Connects a custom form control to the nearest `<Field>`. It returns the id and the ARIA values to bind (`aria-describedby`, `aria-invalid`, `aria-required`), and reports focus and filled state to Field. Field uses that state to move a floating label and set `data-filled`. Every built-in input (Input, Select, Checkbox, RadioGroup, …) uses it. Use it so a custom control works with Field the same way.',
    hasLiveDemo: true,
    extraSourceFiles: ['CustomTextInput.vue'],
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
