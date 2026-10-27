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
      "Opens a confirm flow with one function call. It shows a centered dialog by default (`surface: 'dialog'`), or a popover anchored to `triggerEl` with `surface: 'popover'`. TypeScript offers only the options that fit the `surface` you pick. The confirm button shows its loading state while `onConfirm` runs, and the surface closes only when it succeeds. If `onConfirm` rejects, the surface stays open and `onError` fires. `confirmAction` wraps `openDialog` and `openPopover`; use those for anything it doesn't cover.",
    hasLiveDemo: true,
    params: [
      { name: 'title', type: 'string', description: 'The heading. Required on both surfaces.' },
      { name: 'description', type: 'string', description: '' },
      {
        name: 'confirmLabel / cancelLabel',
        type: 'string',
        description: "The button labels. Default `'Confirm'` and `'Cancel'`.",
      },
      {
        name: 'variant',
        type: 'ButtonVariant',
        description:
          "The confirm button's style. Default `'primary'`. Use `'danger'` for destructive actions.",
      },
      {
        name: 'onConfirm',
        type: '() => unknown | Promise<unknown>',
        description: 'Runs on confirm. The surface waits for it and closes when it succeeds.',
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
        description: 'Sets any Button prop, beyond the label and variant shortcuts.',
      },
      {
        name: 'body / bodyProps',
        type: 'Component / Record<string, unknown>',
        description:
          'Adds content between the description and the buttons, such as a "type DELETE" input.',
      },
      {
        name: 'surface',
        type: "'dialog' | 'popover'",
        description:
          "Where the confirm opens: centered, or anchored to `triggerEl`. Default `'dialog'`.",
      },
      {
        name: 'position / size',
        type: 'DialogPosition / DialogSize',
        description: "Dialog's own `position` and `size` props. Only with `surface: 'dialog'`.",
      },
      {
        name: 'triggerEl',
        type: 'TriggerRef',
        description:
          "The element the popover anchors to, as in `openPopover`. Required with `surface: 'popover'`.",
      },
      {
        name: 'side / align / sideOffset / …',
        type: 'PopoverProps',
        description: "Passes any other Popover prop through. Only with `surface: 'popover'`.",
      },
    ],
    returns: [
      {
        name: 'result',
        type: 'Promise<boolean | undefined>',
        description:
          'Settles with the outcome: `true` on confirm, `false` on cancel, `undefined` when dismissed with Escape or an outside click.',
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
          'The surface panel, `null` until it mounts. Use it to animate the panel with GSAP or motion.',
      },
    ],
  },

  useDialogService: {
    description:
      'Opens dialogs from code instead of markup, with the same behavior as `<Dialog>`. `openDialog(Component, options)` mounts any component as the dialog body, with typed props. Its `result` promise settles with the value the opened component passes to `useDialogRef().close(result)`. `confirmAction()` is built on it. Use it for anything beyond a plain confirm, such as a rename form or a multi-step flow.',
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
          "Reaches the dialog from inside the opened component: `{ data, panelEl, overlayEl, close(result) }`. `close()` settles the opener's `result` promise.",
      },
      {
        name: 'useDialogQueue()',
        type: 'DynamicDialogEntry[]',
        description:
          'Returns the live queue that `<DialogHost/>` renders. Mount `DialogHost` once at the app root.',
      },
    ],
  },

  usePopoverService: {
    description:
      "Opens anchored popovers from code instead of markup, with the same behavior as `<Popover>`. `openPopover(Component, options)` mounts any component inside a Popover anchored to `options.triggerEl`. `triggerEl` is required, because a popover opened from code has no `#trigger` slot. Its `result` promise settles with the value the opened component passes to `usePopoverRef().close(result)`. `confirmAction({ surface: 'popover' })` is built on it. Use it for anything beyond a plain confirm.",
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
          "Reaches the popover from inside the opened component: `{ data, panelEl, close(result) }`. `close()` settles the opener's `result` promise.",
      },
      {
        name: 'usePopoverQueue()',
        type: 'DynamicPopoverEntry[]',
        description:
          'Returns the live queue that `<PopoverHost/>` renders. Mount `PopoverHost` once at the app root, next to `DialogHost`.',
      },
    ],
  },

  useToast: {
    description:
      'Sonner-style toasts you show from code. Call `toast(title, options)` from anywhere, even outside a component. `toast.success`, `.error`, `.warning`, `.info` and `.loading` set the variant for you. `toast.promise(input, messages)` shows a loading toast at once, then swaps it for a success or error toast when the promise settles, with no `dismiss()` call. Toasts render in a `<Toaster/>`, which you mount once at the app root.',
    installNames: ['toast', 'useToastQueue'],
    hasLiveDemo: true,
    params: [],
    returns: [
      {
        name: 'toast(title, options?)',
        type: 'number | string',
        description:
          "Shows a toast with the default variant and returns its id for `dismiss(id)`: a number, or your own `id`. Showing an `id` that's already on screen updates that toast instead of adding another. Options: `id`, `description`, `variant`, `action: { label, onClick }`, and `duration` in ms (default 4000; `Infinity` keeps it until someone closes it). `pinned` shows the toast in its own section, where newer toasts can't cover it. `toaster` sends it to the `<Toaster>` with that `name` instead of the unnamed one.",
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
          "Reads one Toaster's queue and pauses or resumes its timers: the unnamed Toaster, or the one whose `name` you pass. `<Toaster/>` uses it to pause timers on `pointerenter`. `setWaiting(ids)` holds the timers of toasts that aren't on screen yet.",
      },
    ],
  },

  useTour: {
    description:
      "The headless state machine behind `<Tour>`. It tracks the step index and groups, handles navigation and awaits each step's `onBeforeEnter`. It renders nothing and doesn't touch the DOM. `<Tour>` is `useTour()` plus a spotlight overlay and a `Popover` callout. Use the composable to build your own walkthrough UI, such as one animated with your own library, a callout that doesn't float, or an embedded panel.",
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

// Point your own spotlight and callout at currentStep.value.target.
// next(), prev() and skip() move the tour; isTransitioning is true while an
// onBeforeEnter is pending.
open.value = true`,
    params: [
      {
        name: 'open',
        type: 'Ref<boolean>',
        description:
          "Shows or hides the tour. `true` resets to the first step: it waits for that step's `onBeforeEnter`, then fires `onStepChange` with `reason: 'open'`. `false` closes the tour without resetting it.",
      },
      {
        name: 'id',
        type: 'string',
        description:
          "Names this tour in every `details` object, so one shared handler can tell tours apart. vael-ui doesn't read it otherwise.",
      },
      {
        name: 'steps',
        type: 'MaybeRefOrGetter<readonly TourStep[]>',
        description:
          "The steps, in the same shape as `<Tour>`'s `steps` prop. Each step has a `target` (a `DOMTarget`), plus optional `title`, `description`, `side`, `align`, `sideOffset`, `alignOffset`, `spotlightPadding`, `spotlightRadius`, `disableInteraction`, `onBeforeEnter` and `group`.",
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
        description: 'The steps grouped as `{ group, steps }[]`, in first-seen order.',
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
          'Moves one step. On the last step, `next()` calls `onFinish` and sets `open.value = false` instead.',
      },
      {
        name: 'skip',
        type: '() => void',
        description: 'Ends the tour: calls `onSkip` and sets `open.value = false`.',
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
        description: 'The locale to format for. Default: the runtime locale.',
      },
      {
        name: 'mode',
        type: "MaybeRefOrGetter<'decimal' | 'currency' | 'percent' | undefined>",
        description: "The format style. Default `'decimal'`.",
      },
      {
        name: 'currency',
        type: 'MaybeRefOrGetter<string | undefined>',
        description: "The ISO currency code. Default `'USD'` when `mode` is `'currency'`.",
      },
      {
        name: 'minFractionDigits',
        type: 'MaybeRefOrGetter<number | undefined>',
        description:
          'The fewest decimals to show, passed to `Intl.NumberFormat` as `minimumFractionDigits`.',
      },
      {
        name: 'maxFractionDigits',
        type: 'MaybeRefOrGetter<number | undefined>',
        description:
          'The most decimals to show, passed to `Intl.NumberFormat` as `maximumFractionDigits`.',
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
          "Adds literal text that `Intl` doesn't handle, such as a unit label. `format` adds it and `parse` strips it.",
      },
    ],
    returns: [
      {
        name: 'formatOptions',
        type: 'ComputedRef<Intl.NumberFormatOptions>',
        description:
          'The `Intl.NumberFormat` options built from `mode`, `currency`, the fraction digits and grouping. Pass them to AnimatedNumber for the same format.',
      },
      {
        name: 'format',
        type: '(value: number | null) => string',
        description:
          "Turns a number into the full localized string, affixes included. Returns `''` for `null` or `NaN`.",
      },
      {
        name: 'parse',
        type: '(text: string) => number | null',
        description:
          "Turns typed text back into a number. Returns `null` for anything that isn't a complete, unambiguous number, including valid in-progress input.",
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
      "Stops iOS from zooming the page when you focus a field. iOS zooms on any field with text under 16 px, and vael-ui's fields follow your font size, so at 14 px they trigger it. Call `preventFocusZoom()` once and fields keep your size on iPhone without the zoom. It adds `maximum-scale=1` to the viewport on iOS only, where pinch-to-zoom keeps working. Android and desktop never zoom on focus, so it leaves them alone. To get bigger fields on phones instead of changing the viewport, set `--ui-touch-font-size: 16px`.",
    exampleCode: `// main.ts
import { preventFocusZoom } from 'vael-ui'

preventFocusZoom()`,
    params: [],
    returns: [
      {
        name: 'changed',
        type: 'boolean',
        description:
          'Whether it changed the viewport: `true` on iOS, `false` elsewhere and during server rendering.',
      },
    ],
  },

  useHaptic: {
    hasLiveDemo: true,
    description:
      'Plays haptic feedback on phones that support it: `navigator.vibrate` on Android, and on iOS (Safari 17.4+) the tick a native switch plays. Desktops do nothing, and `isSupported` tells you which you have. `intensity` scales every pulse. `ConfigProvider`\'s `haptics` sets it app-wide: `false` silences every call, yours included, for a "turn off haptics" setting, and `true` or `{ intensity }` also turns on vael-ui\'s own haptics. Call it from a user gesture, and keep it for moments that commit something.',
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
          "Scales every pulse: `0.5` is softer, `2` stronger. Default `1`. Multiplies with ConfigProvider's `haptics.intensity`. On Android it lengthens each pulse; iOS plays one fixed-strength tick per pulse.",
      },
    ],
    returns: [
      { name: 'isSupported', type: 'boolean', description: 'Whether this device plays haptics.' },
      {
        name: 'selection',
        type: '() => void',
        description: 'Plays the lightest tick, for a choice changing.',
      },
      {
        name: 'impact',
        type: "(weight?: 'light' | 'medium' | 'heavy') => void",
        description: "Plays a bump, heavier for bigger moments. Default `'medium'`.",
      },
      {
        name: 'notification',
        type: "(type: 'success' | 'warning' | 'error') => void",
        description: 'Plays a short pattern for an outcome.',
      },
      {
        name: 'vibrate',
        type: '(pattern: number | number[]) => void',
        description:
          'Plays your own pattern in ms, vibration and pause alternating. iOS plays a tick per pulse.',
      },
    ],
  },

  springEasing: {
    description:
      'Turns a spring into a CSS `linear()` curve and the time it takes to settle, in ms. It\'s the curve vael-ui uses for `ConfigProvider`\'s `:motion="{ spring }"`. The result has the same shape as the options `element.animate()` takes, so your own animations can move on the same spring without a library. Damping below 1 overshoots.',
    exampleCode: `import { springEasing } from 'vael-ui/motion'

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
          'The spring to convert. Damping 1 settles without overshoot; below 1 it overshoots. `response` is roughly the time to arrive, in seconds.',
      },
    ],
    returns: [
      {
        name: 'easing',
        type: 'string',
        description: 'The CSS `linear()` easing that follows the spring.',
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
      "Sets the root `data-theme` to `light` or `dark`; `system` follows the OS preference. Pass `persist` to save the choice in cookies, a store or `localStorage`. Vue restores a saved choice on mount, which can be after first paint, so the HTML head example restores the color mode, and an optional root font size, before paint. Every call in the browser shares one state, so two toggles never disagree. Pass `{ from: event }` as the second argument to `setMode` and the new scheme spreads in a circle from the click, as the example below and this site's header toggle do. It uses a View Transition; browsers without one, and reduced motion, switch at once.",
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
          "Saves and restores the choice. Without it, nothing is saved. `set` receives `null` for `'system'`.",
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
        description: "The applied theme, with `'system'` resolved against the live media query.",
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
      'The positioning engine behind `Popover`, `Menu` and `Tooltip`, built on Floating UI. It computes `positionerStyle` (absolute `top` and `left`, plus `visibility`) for a reference and a floating element. It flips and shifts to stay on screen, and tracks changes with `autoUpdate` while `active` is `true`. Use it to build an anchored surface that no overlay component fits.',
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
          'Turns positioning on. Scroll and resize tracking run only while it is `true`.',
      },
      {
        name: 'side',
        type: 'MaybeRefOrGetter<Side>',
        description:
          "The side of the reference to place it on. It flips when there's no room. Default `'bottom'`.",
      },
      {
        name: 'align',
        type: "MaybeRefOrGetter<'start' | 'center' | 'end'>",
        description: "How it lines up along that side. Default `'center'`.",
      },
      {
        name: 'sideOffset',
        type: 'MaybeRefOrGetter<number>',
        description: 'The gap from the reference in px, along `side`. Default `8`.',
      },
      {
        name: 'alignOffset',
        type: 'MaybeRefOrGetter<number>',
        description: 'The shift along the alignment axis, in px. Default `0`.',
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
        description: 'The position to bind on the floating element: `:style="positionerStyle"`.',
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
          "Points at the reference's center, on the panel's facing edge, so a scale animation grows out of the reference.",
      },
      {
        name: 'maxHeight',
        type: 'Ref<number | null>',
        description: 'The height left for the surface in px, or `null` while inactive.',
      },
      {
        name: 'update',
        type: '() => Promise<void>',
        description: "Measures again, for a change `autoUpdate` doesn't catch.",
      },
    ],
  },

  useVirtualizer: {
    description:
      'Renders only the visible rows of a long list, plus a few extra rows past each edge (overscan). `Select`, `Combobox` and `DataTable` use it for large lists. Use it to do the same for a scrolling list of your own.',
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
        description: 'The total number of rows.',
      },
      {
        name: 'itemSize',
        type: 'MaybeRefOrGetter<number | undefined>',
        description:
          'The row size in px. Omit it to measure the first rendered row, with a 36 px estimate until then.',
      },
      {
        name: 'overscan',
        type: 'MaybeRefOrGetter<number>',
        description: 'The extra rows rendered past each edge. Default `8`.',
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
          'Gives the container its full scroll height. Bind it to a relatively positioned spacer inside the container.',
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
          "Scrolls a row into view. Default `'nearest'`, which suits keyboard navigation: it doesn't scroll when the row is already visible.",
      },
      {
        name: 'measuredSize',
        type: 'Readonly<Ref<number | null>>',
        description: 'The resolved row size.',
      },
    ],
  },

  useScrollProgress: {
    description:
      "Scroll progress as a ref from 0 to 1: the page's, from top to bottom, or an element's way through the screen (or a scrolling container). Pass it to `v-animate`'s `progress` as a getter, `progress: () => scroll.value`, and keyframes follow the scroll without re-rendering the component. It measures on the next frame after a scroll or resize, and stops when its scope ends.",
    installNames: ['useScrollProgress'],
    hasLiveDemo: true,
    params: [
      {
        name: 'target',
        type: 'MaybeRefOrGetter<Element | null | undefined>',
        description:
          "The element whose way through the screen to track. Leave it out for the page's scroll from top to bottom.",
      },
      {
        name: 'options.container',
        type: 'MaybeRefOrGetter<Element | null | undefined>',
        description: 'A scrolling element to measure in, instead of the page.',
      },
      {
        name: 'options.axis',
        type: "'x' | 'y'",
        description: "Which way it scrolls. Default `'y'`.",
      },
      {
        name: 'options.offset',
        type: '[string, string]',
        description:
          "Where it starts and ends, each a `'<target edge> <container edge>'` pair: `start`, `center`, `end`, a share such as `0.25`, px or %. `'start end'` is the target's start meeting the container's end. Default `['start end', 'end start']`: from entering to having left.",
      },
    ],
    returns: [
      {
        name: 'progress',
        type: 'Readonly<Ref<number>>',
        description: 'From 0 to 1, clamped. `0` on the server.',
      },
    ],
  },
  settled: {
    description:
      'Resolves once nothing vael-ui started is still animating, for tests: open something, `await settled()`, then assert. Pass an element to wait only for what animates on it and inside it, such as a field\'s invalid shake: `await settled(field.value?.el)`. With nothing playing (reduced motion, `motion="false"`, or no element) it resolves at once, and it never waits for an endless loop. In app code, put a callback on what animates instead, such as `onAfterEnter` or `onAfterLeave`.',
    installNames: ['settled'],
    exampleCode: `import { settled } from 'vael-ui/motion'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import App from './App.vue'

test('the dialog opens', async () => {
  const screen = render(App)
  await screen.getByRole('button', { name: 'Open' }).click()
  await settled()
  await expect.element(screen.getByRole('dialog')).toBeVisible()
})`,
    params: [
      {
        name: 'scope',
        type: 'Element | null',
        description:
          'Waits only for what animates on this element and inside it. Leave it out to wait for everything vael-ui started.',
      },
    ],
    returns: [
      {
        name: 'promise',
        type: 'Promise<void>',
        description: 'Resolves once those animations have finished.',
      },
    ],
  },
  useTween: {
    description:
      'A number that eases to each new value of its source, from wherever it is: a cart total, a percentage, a value you draw yourself. Change the source mid-way and it turns toward the new value from where it shows, with no jump. It rides the app\'s spring unless you give it your own `spring`, or a `duration` and `easing`, as everywhere else in vael-ui. With `motion="false"` on a ConfigProvider around it, or under reduced motion, it jumps. For a value that should keep its speed through a change, such as one following a drag, use `useSpringValue`.',
    installNames: ['useTween'],
    exampleCode: `import { shallowRef } from 'vue'
import { useTween } from 'vael-ui/motion'

const total = shallowRef(0)
// Eases to each new total from wherever it is.
const shown = useTween(total, { duration: 600, easing: 'out' })`,
    params: [
      {
        name: 'source',
        type: 'MaybeRefOrGetter<number>',
        description:
          'The value to follow: a ref, a getter such as `() => props.total`, or a number.',
      },
      {
        name: 'options',
        type: 'MaybeRefOrGetter<TweenOptions>',
        description:
          "Its timing: `spring` (a name or `{ damping, response }`), or `duration` in ms and `easing` (a token such as `'out'`, or any CSS easing), and `delay` in seconds. Unset, the app's spring.",
      },
    ],
    returns: [
      {
        name: 'value',
        type: 'Readonly<ShallowRef<number>>',
        description:
          'The number as it eases, every frame. Bind it in a template or read it in a computed.',
      },
    ],
  },
  useSpringValue: {
    description:
      "vael-ui's spring engine: the physics behind Sortable, Tree and DataTable reordering, and behind every sliding indicator set to a spring. A spring has no duration. You give it a target, and it moves there from where it is now, at the speed it already has. So every animation can be interrupted: call `set()` mid-flight and the value turns toward the new target with no jump. `useSpringValue` returns a ref to bind in a template. `createSpring` calls `onFrame` with each frame instead, so a value that drives a style never re-renders a component. `stepSpring` is the pure step under both, for tests and plots. One shared `requestAnimationFrame` loop runs every moving spring, and it stops once they all rest.",
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
          'How much the spring resists bouncing. Default `1`: the value reaches the target with no overshoot. Below `1` it overshoots and oscillates, more the lower you go. Above `1` it creeps in more slowly. Save overshoot for motion you threw, such as a flick release, not for something that only appeared.',
      },
      {
        name: 'options.response',
        type: 'number',
        description:
          'How quickly the spring converges, in seconds. Default `0.35`. It is the period of the undamped oscillation, not how long the spring runs: the real settle time comes from the distance, the speed and the damping. Lower is snappier.',
      },
      {
        name: 'options.epsilon',
        type: 'number',
        description:
          'When the spring stops. Once the distance to the target and the speed per second are both below it, the spring snaps to the target. Default `0.05`, which suits px. Lower it for a value on a 0 to 1 scale, such as opacity, where 0.05 is a visible step.',
      },
      {
        name: 'onFrame',
        type: '(value: number) => void',
        description:
          'Receives the new value on every frame, on `jump()`, and on a `set()` that is already at rest on the target. Write the value straight to a style here. `createSpring` only.',
      },
    ],
    returns: [
      {
        name: 'value',
        type: 'Ref<number>',
        description:
          'The live value, updated every frame. Read it, and move it with `set()` and `jump()` instead of assigning to it. `useSpringValue` only.',
      },
      {
        name: 'set(target, { velocity? })',
        type: '(target: number, options?: { velocity?: number }) => void',
        description:
          'Sets a new target, starting from the current value and velocity, so an interrupted spring turns smoothly. Pass `velocity`, in units per second, to continue a gesture: the animation starts at the speed the drag ended with, so there is no seam.',
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
        description: 'Stops the spring where it is now. The current value becomes the target.',
      },
      {
        name: 'createSpring(initial, options?, onFrame?)',
        type: 'SpringHandle',
        description:
          'Creates the same spring without a ref. Besides `set`, `jump` and `stop`, the handle has read-only `value`, `velocity`, `target` and `isAnimating`, and `destroy()`, which takes it off the frame loop. Call `destroy()` when you unmount; `useSpringValue` does that for you when its scope ends. Options are read once, so create a new spring to change them.',
      },
      {
        name: 'stepSpring(state, target, dt, damping?, response?)',
        type: 'SpringState',
        description:
          "Runs one semi-implicit Euler step from `{ value, velocity }` over `dt` seconds. It's pure, with no frame loop, so you can test or plot a spring with plain numbers. A `dt` of 0 or less returns the state unchanged. The live loop caps each frame at 1/30 s, so a tab returning from the background doesn't fling every spring.",
      },
    ],
  },

  useTabIndicator: {
    description:
      "The sliding indicator behind Tabs, SelectButton, Pagination and MenuList, and behind the active option in Select, Combobox and CommandPalette. It measures the active element inside a list and returns a style that places an indicator element on it. When the active element changes, the indicator glides there. `useHoverIndicator` builds the hover highlight on the same measurement. Use it for your own segmented control, nav or list: put the indicator element inside the list, give the list `position: relative`, and bind the `style`. It measures again when the list resizes, when web fonts load, and when an ancestor finishes a CSS transition, such as a dialog scaling in. It also undoes an ancestor's scale, so the px values match the layout.",
    hasLiveDemo: true,
    params: [
      {
        name: 'active',
        type: 'WatchSource<unknown>',
        description:
          'Moves the indicator when it changes, such as the selected value. It measures after each change, once the DOM shows it. For a list that also filters, pass a getter of both: `() => [activeIndex.value, items.value]`.',
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
          "The axis it moves along. Default `'horizontal'`, which sets the inline position and size. `'vertical'` sets the block position and size.",
      },
      {
        name: 'selector',
        type: 'MaybeRefOrGetter<string>',
        description:
          'Finds the active element: the first match inside `listEl`. Default `\'[role="tab"][aria-selected="true"]\'`. SelectButton uses `\'[data-checked]\'`, and Pagination uses `\'[aria-current="page"]\'`. With no match, the style sets `opacity: 0`.',
      },
      {
        name: 'sizing',
        type: "MaybeRefOrGetter<'bounds' | 'transform'>",
        description:
          "How it sizes the indicator. Default `'bounds'`: real position and size in px, so a border radius stays true at any size. `'transform'` uses `translate` and `scale` on a 1 px baseline instead. It's cheaper, but a radius on the scaled axis flattens, and it can look misaligned at fractional pixel ratios. Use it only for an indicator with square ends, such as an underline. `scroller`, `matchCross`, `maxGlide` and a spring need `'bounds'`.",
      },
      {
        name: 'scroller',
        type: 'boolean',
        description:
          'Set it when `listEl` scrolls and the indicator sits inside its scrolled content. Positions then include the scroll offset, so the indicator scrolls with the rows.',
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
          "Makes long moves jump: a move longer than this many of the active element's own lengths jumps instead of gliding. That suits typeahead, Home and End, and a filtered list. With it set, a list that loses its match shows the next one in place instead of sliding in. Unset, every move glides.",
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
          "How it moves: `'glide'` (a CSS transition), `'instant'`, or a spring (see `useSpringValue`). Unset, it follows the nearest ConfigProvider's `indicator`, else `'glide'`. A spring needs `indicatorEl`. It jumps instead of springing on its first appearance, past `maxGlide`, and under reduced motion.",
      },
      {
        name: 'indicatorEl',
        type: 'Ref<HTMLElement | null>',
        description:
          'The indicator element. A spring writes position and size straight to its inline style each frame, with no re-render.',
      },
      {
        name: 'position',
        type: "'inset' | 'translate'",
        description:
          "How it places the indicator. Default `'inset'`. `'translate'` moves it with `translate` from the list's top-left corner, which the compositor animates without layout; its CSS must set `top: 0; left: 0` and transition `translate`. `'bounds'` sizing only.",
      },
      {
        name: 'stretch',
        type: 'MaybeRefOrGetter<boolean | { trail?, delay? } | undefined>',
        description:
          "Moves the two edges on their own springs, so the indicator stretches as it travels: the edge facing the move leads and the other trails. `trail` is the trailing edge's spring, and `delay` the seconds it waits (default `0.05`). It moves on a spring even when `indicator` is `'glide'`. `'inset'` position only.",
      },
      {
        name: 'squash',
        type: 'MaybeRefOrGetter<number | undefined>',
        description:
          'Flattens the indicator at the start of each move to this cross-axis scale, such as `0.82`, then springs it back to 1. Needs `indicatorEl`.',
      },
    ],
    returns: [
      {
        name: 'style',
        type: 'Ref<Record<string, string | undefined>>',
        description:
          "The position and size in px, to bind on the indicator element, with `opacity: 0` while nothing matches. On first paint, on first appearance and past `maxGlide`, it sets the position and size durations to `0ms`, so the indicator doesn't grow in from the edge. Those overrides go slot by slot, so list your transition as position, size, then opacity, the order the `ui-indicator` classes use. With a spring, it holds only `transition-property: opacity`.",
      },
      {
        name: 'update',
        type: '() => void',
        description: 'Measures again before the next paint. Several calls in a row measure once.',
      },
    ],
  },

  useScrollLock: {
    description:
      "Locks scrolling on an element, `document.body` by default. Dialog, Drawer, BottomSheet and Tour use it while they are open. It sets `overflow: hidden` and `overscroll-behavior: contain`. It also pads the element's inline end by the scrollbar's width, so the layout doesn't shift when the scrollbar goes. It sets that width as `--ui-scrollbar-width` too, on `<html>` for a body lock, so a fixed header can add the same padding. Locks are counted per element: when two dialogs lock the body, it stays locked until both release. On release, the inline styles from before the lock come back, unless something else changed them in the meantime. On iOS, a body lock also blocks touch scrolling, except inside a scrollable region within the body.",
    hasLiveDemo: true,
    params: [
      {
        name: 'target',
        type: 'MaybeRefOrGetter<HTMLElement | null>',
        description:
          'The element to lock. Default `document.body`. When it changes while locked, the lock moves to the new element; `null` releases it.',
      },
      {
        name: 'initial',
        type: 'boolean',
        description: 'Locks at once when `true`. Default `false`.',
      },
    ],
    returns: [
      {
        name: 'locked',
        type: 'WritableComputedRef<boolean>',
        description:
          'Locks while `true`. The composable returns this ref itself: `const locked = useScrollLock()`. The lock also releases when the calling scope ends, such as on unmount.',
      },
    ],
  },

  useHoverIndicator: {
    description:
      'The sliding hover highlight behind every vael-ui list: Select, Menu, Tree, DataTable, Tabs, Pagination, Calendar and the rest. It slides one indicator element to the row under a mouse or pen, or to the row with keyboard focus, which always wins. Touch is ignored, as hover styles are. Use it to give your own list the same feel: mark the rows with `itemSelector`, put an element with the `ui-indicator` class inside the list, and bind the `style` it returns. The list needs `position: relative; isolation: isolate`, so the indicator sits behind the rows. Style it with `--ui-indicator-bg`, `--ui-duration-indicator` and `--ui-ease-indicator`, or set `motion: false` and drive it yourself.',
    installNames: ['useHoverIndicator'],
    hasLiveDemo: true,
    params: [
      {
        name: 'listEl',
        type: 'Ref<HTMLElement | null>',
        description: 'The list. The indicator element goes inside it and moves in its coordinates.',
      },
      {
        name: 'itemSelector',
        type: 'string',
        description: 'Matches the rows the indicator moves between. It skips disabled rows.',
      },
      {
        name: 'scope',
        type: 'string',
        description:
          'Keeps nested lists apart: a row counts only when its nearest match for this selector is `listEl` itself, so a submenu or a table in an expanded row keeps its own rows.',
      },
      {
        name: 'orientation',
        type: "MaybeRefOrGetter<'vertical' | 'horizontal'>",
        description:
          "The axis it moves along. Default `'vertical'`. For a row of buttons, use `'horizontal'` with the `ui-indicator--inline` class; for a grid, add `ui-indicator--grid` to glide on both axes.",
      },
      {
        name: 'scroller',
        type: 'boolean',
        description:
          'Set it when `listEl` scrolls, so the indicator scrolls with the rows inside it.',
      },
      {
        name: 'matchCross',
        type: 'boolean',
        description:
          'Also matches each row across the list, for rows inset by its padding. Default `true`.',
      },
      {
        name: 'maxGlide',
        type: 'number',
        description:
          'A keyboard move longer than this many rows, such as typeahead, Home or End, jumps instead of gliding. The pointer always glides. Default `3`.',
      },
      {
        name: 'enabled',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          '`false` hides the indicator and stops tracking, such as while a row is being dragged.',
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
      {
        name: 'group',
        type: 'string',
        description:
          "Passes the highlight between lists with the same `group`, so moving from one into the next glides across instead of fading out and in. MenuList and Tree use `'menu-list'` and `'tree'`.",
      },
    ],
    returns: [
      {
        name: 'style',
        type: 'Ref<Record<string, string | undefined>>',
        description:
          'The position and size in px, to bind on the indicator element, with `opacity: 0` while nothing is hovered or focused. The highlighted row also gets `data-indicated`.',
      },
    ],
  },

  useSortable: {
    description:
      "The drag-to-reorder engine behind `<Sortable>`, nested reordering in `<Tree>` and column reordering in `<DataTable>`, with rows that move on springs. Pointer and keyboard input drive the same grabbed state. Pure, separately tested functions make every ordering and nesting decision. `<Sortable>` is an optional wrapper around it; use the composable when you need markup a component can't give you. To move items between lists, use `useSortableGroup()`, which wraps the same engine.",
    hasLiveDemo: true,
    params: [
      {
        name: 'rows',
        type: 'MaybeRefOrGetter<readonly FlatSortableRow[]>',
        description:
          'The visible rows in visual order, as `{ value, depth, parentValue }`. It is read again each time a row is grabbed.',
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
        description: 'Applies the reorder. It fires once, on a committed drop.',
      },
      {
        name: 'axis',
        type: "MaybeRefOrGetter<'y' | 'x'>",
        description:
          "The axis rows reorder along. Default `'y'`. Nesting only works on `'y'`. Rows that wrap onto more lines (a card grid) reorder in reading order, slot by slot.",
      },
      {
        name: 'nested',
        type: 'MaybeRefOrGetter<boolean>',
        description: 'Allows depth changes. `Tree` turns it on; a flat list leaves it off.',
      },
      {
        name: 'dropOnTarget',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          'Drops into a row, as in VS Code: hovering the middle of a row drops the item inside it. Requires `nested`.',
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
          'Sets the share of a target\'s size, at each end, that means "beside it" rather than "into it". Default `0.25`, which leaves a 50% inside zone. Lower it for targets that are hard to hit.',
      },
      {
        name: 'canNestInto',
        type: '(value) => boolean',
        description: 'Says which rows accept children. Without it, every row does.',
      },
      {
        name: 'childCountOf',
        type: '(value) => number',
        description: 'Returns the child count, so an "inside" drop appends to the end.',
      },
      {
        name: 'dragPreview',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          'Lifts the grabbed row into a floating preview that follows the cursor, and dims its slot. Without it, the row stays in the layout and slides past its neighbors.',
      },
      {
        name: 'previewMode',
        type: "MaybeRefOrGetter<'element' | 'clone'>",
        description:
          "What floats while you drag. `'element'` lifts the real row, so only one copy is on screen. `'clone'` floats a separate copy and hides the real row until the drop. Use `'clone'` when the real element can't leave its layout, such as a `<tr>` or `<th>`. The default depends on context: `'element'` once a `group` drag leaves this list, `'clone'` for a plain `dragPreview` drag.",
      },
      {
        name: 'previewCarriesSubtree',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          "Moves the dragged row's visible descendants, such as an expanded folder, inside the floating clone at their current offsets, so the whole block lifts as one piece. Default `true`. Only with `dragPreview` and `nested`.",
      },
      {
        name: 'disabled',
        type: 'MaybeRefOrGetter<boolean>',
        description: 'Turns off dragging.',
      },
      {
        name: 'motion',
        type: 'MaybeRefOrGetter<boolean>',
        description: '`false` turns off the built-in springs, so rows snap into place.',
      },
      {
        name: 'canDrop',
        type: '(details: SortableDropDetails) => boolean',
        description:
          'Vetoes a drop target while dragging. Returning `false` marks the target invalid and blocks the drop. It runs again on every move, so keep it cheap.',
      },
      {
        name: 'beforeDrop',
        type: '(details) => boolean | Promise<boolean>',
        description:
          'Checks a drop before it happens. Return `false`, or a promise of `false`, to cancel and spring the item back. Works with `confirmAction().result`.',
      },
      {
        name: 'onDropError',
        type: '(error, details) => void',
        description:
          'Fires when `beforeDrop` throws or rejects. The move is already reverted by then.',
      },
      {
        name: 'labelOf / announce',
        type: '(value) => string / (event) => string',
        description: 'Return the row label and the live-region text for screen readers.',
      },
      {
        name: 'group / groupId / container',
        type: 'SortableGroupHandle / string | number / MaybeRefOrGetter<HTMLElement | null>',
        description:
          'Shares drag sessions with other `useSortable()` lists that get the same handle. See `useSortableGroup()`. `container` is only needed with `group`, so a drag can find an empty list.',
      },
      {
        name: 'restrictToList',
        type: 'MaybeRefOrGetter<boolean>',
        description:
          "Keeps a floating row inside the part of the list it's over that's on screen, so it never hangs past a fixed-height column. Default `false`.",
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
        name: 'isSettling',
        type: 'Ref<boolean>',
        description:
          '`true` from a drop or cancel until every row reaches its slot. A list that clips its overflow only while `isGrabbed` should stay open while this is true too.',
      },
      {
        name: 'isGrabbedValue',
        type: '(value) => boolean',
        description:
          'Says whether a row is part of the drag: `:data-grabbed="isGrabbedValue(row.value) || undefined"`. It\'s `true` for a folder\'s whole dragged subtree, not only the grabbed row.',
      },
      {
        name: 'dropPosition / isValidDrop / isPending',
        type: 'Ref',
        description:
          'Where the item would drop, whether `canDrop` allows it, and whether an async `beforeDrop` is still pending.',
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
        description: "Every value in the dragged block, including a folder's descendants.",
      },
      {
        name: 'isForeignDropTarget',
        type: 'Ref<boolean>',
        description:
          '`true` while a drag from another list in the group hovers this list. Always `false` for the list the drag started in. Use it to style drop-target feedback. Only with `group`.',
      },
      {
        name: 'announcement',
        type: 'Ref<string>',
        description:
          'The text for screen readers. Render it in an `aria-live="assertive"` element.',
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
          'Returns `true` once after a committed drag, so you can ignore the click that follows it.',
      },
      {
        name: 'cancel',
        type: '() => void',
        description: 'Cancels the current grab and springs everything back.',
      },
    ],
  },

  useSortableGroup: {
    description:
      'Moves items between lists, the building block for a Kanban-style board. `<Sortable>`, `<Tree>`, column reordering in `<DataTable>` and `v-draggable` reorder within one list; this lets an item move from one `useSortable()` list into another, on the same engine. Each list still calls `useSortable()`, or uses `<Sortable>` with the same `group` and `groupId` props. The group decides which list shows the open gap, and runs the transfer on drop. The list where the drag started keeps the pointer or keyboard gesture until the drag ends.',
    hasLiveDemo: true,
    params: [
      {
        name: 'onTransfer',
        type: '(value, from: GroupDropPosition, to: GroupDropPosition) => void',
        description:
          "Moves the item between your arrays. It fires once, on a committed drop into another list: take the item at `from.index` out of the array for `from.groupId`, and insert it at `to.index` in the array for `to.groupId`. Use the indexes: `value` is the item's key from a `Sortable`, but its position from `v-draggable`, which has no keys. Required. It belongs to the group, not to each list, because a move between lists isn't either list's decision.",
      },
      {
        name: 'canDrop',
        type: '(details: GroupDropDetails) => boolean',
        description:
          'Vetoes a move between lists while dragging, such as a work-in-progress limit on the target column. It runs again on every move, so keep it cheap.',
      },
      {
        name: 'beforeDrop',
        type: '(details: GroupDropDetails) => boolean | Promise<boolean>',
        description:
          "Checks a drop before it happens. Return `false`, or a promise of `false`, to cancel and spring the item back. Works with `confirmAction().result`, like `useSortable`'s `beforeDrop`.",
      },
      {
        name: 'onDropError',
        type: '(error: unknown, details: GroupDropDetails) => void',
        description:
          'Fires when `beforeDrop` throws or rejects. The move is already reverted by then.',
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
          'Adds a list to the group: `useSortable()` with `group` and `groupId` already set, so each column is one call. Without a `groupId`, it assigns one; pass your own so `onTransfer` knows which array to update.',
      },
    ],
  },

  moveTreeNode: {
    description:
      "Moves a node in a tree you can reorder. `moveTreeNode` moves a node and its subtree to a new parent and index, changing your array in place, as `removeTreeNode` does. Its `to` argument is the `DropPosition` that `useSortable`'s `onCommit` receives, so the two connect directly. Tree commits its drag reordering through it, and Sortable uses it for flat lists. It runs `isDescendantOf` first, because dropping a folder into its own descendant would detach that branch and lose it. Nodes are read as `{ value, children }` by default, the shape `TreeNode` and `MenuItemData` already have. Pass accessors for any other shape.",
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
          "Where the node goes: `{ parentValue, index, depth }`. `parentValue` is the new parent's key, or `null` for the top level. `index` is the node's final slot among its new siblings, counted as if the node were already removed, and clamped to the array. `depth` is not read.",
      },
      {
        name: 'accessors',
        type: 'TreeAccessors<T>',
        description:
          "Reads nodes of any shape. Optional. `getKey` reads a node's key, `node.value` by default. `getChildren` reads its children, `node.children` by default. `setChildren` attaches a new children array when the new parent has none yet, assigning `node.children` by default.",
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
      "The drag-and-drop half of FileUpload. It makes any element a drop target for files from the desktop, tracks whether a drag is over it, and passes the dropped files to `onFiles`. It counts nested `dragenter` and `dragleave` events, so moving over a child element doesn't flicker the state. It doesn't validate anything: check type, size and count yourself, as FileUpload does with `accept`, `maxSize` and `maxFiles`. It doesn't open a file picker either, so pair it with an `<input type=\"file\">` for keyboard and touch users, who can't drag files.",
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
          "Receives every dropped file. A drop with no files, such as dragged text, doesn't call it.",
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
          '`true` while a drag with files is over the target. Other drags, such as selected text, are ignored, and turning `disabled` on clears it.',
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
          'Tells the nearest Field whether the control has a value, including values your code sets through `v-model`.',
      },
    ],
    returns: [
      {
        name: 'id',
        type: 'string',
        description:
          "The id to bind on the control: Field's `controlId` when there is one, otherwise a new `useId()`.",
      },
      {
        name: 'describedBy',
        type: '() => string | undefined',
        description: 'The value for `aria-describedby`.',
      },
      {
        name: 'labelledBy',
        type: '() => string | undefined',
        description:
          'The value for `aria-labelledby`, on group controls such as RadioGroup that have no single native input.',
      },
      {
        name: 'invalid',
        type: '() => boolean',
        description:
          "Whether Field marks the control invalid. Combine it with the control's own `invalid` prop.",
      },
      {
        name: 'required',
        type: '() => boolean',
        description: 'The value for `aria-required`.',
      },
      {
        name: 'disabled',
        type: '() => boolean',
        description:
          "Whether Field disables the control. Combine it with the control's own `disabled` prop.",
      },
      {
        name: 'onFocus',
        type: '() => void',
        description: "Reports focus to Field. Call it from the control's native `focus` event.",
      },
      {
        name: 'onBlur',
        type: '() => void',
        description: "Reports blur to Field. Call it from the control's native `blur` event.",
      },
    ],
  },
}
