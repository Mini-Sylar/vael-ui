// The motion API contract (plans/008, plans/009 M0). Types only; the runtime implements them.
import type { ComponentPublicInstance, CSSProperties, TransitionProps } from 'vue'
import type { IndicatorSpring } from '../composables/useTabIndicator'

// ─── Vocabulary ──────────────────────────────────────────────────────────────

/** A spring. `damping` 1 settles without overshoot, below 1 it bounces; `response` is roughly the seconds to arrive. */
export type Spring = IndicatorSpring

/** vael-ui's easing tokens. Any CSS easing string works too. */
export type UiEase =
  | 'var(--ui-ease-out)'
  | 'var(--ui-ease-in-out)'
  | 'var(--ui-ease-drawer)'
  | 'var(--ui-ease-pop)'
  | 'var(--ui-ease-toast)'
  | 'var(--ui-ease-indicator)'
  | 'var(--ui-ease-number)'
  | 'var(--ui-ease-text)'

/** vael-ui's duration tokens. Any number of milliseconds works too. */
export type UiDuration =
  | 'var(--ui-duration-press)'
  | 'var(--ui-duration-enter)'
  | 'var(--ui-duration-exit)'
  | 'var(--ui-duration-drawer)'
  | 'var(--ui-duration-drawer-exit)'
  | 'var(--ui-duration-tooltip)'
  | 'var(--ui-duration-tooltip-exit)'
  | 'var(--ui-duration-toast)'
  | 'var(--ui-duration-toast-exit)'

// Shown by TypeScript when both are given, so the error says what to change.
type PickOne = 'use spring, or duration with easing, not both'

/** A spring, or a duration with an easing; never both. */
export type MotionTiming =
  | { spring?: Spring; duration?: PickOne; easing?: PickOne }
  | { spring?: PickOne; duration?: number | UiDuration; easing?: UiEase | (string & {}) }

type Length = number | (string & {})
interface Shorthands {
  /** Moves along the inline axis, in px when a number. Mirrors in right-to-left layouts. */
  x?: Length
  /** Moves along the block axis, in px when a number. */
  y?: Length
  /** `filter: blur()`, in px when a number. */
  blur?: Length
}
type StyleProps = Omit<CSSProperties, keyof Shorthands> & Shorthands

/** One value with its own timing: `y: { value: 12, spring: { damping: 0.4, response: 0.5 } }`. */
export type TimedValue<V> = MotionTiming & {
  value: V | V[]
  /** Seconds before this value starts, on top of the element's own delay. */
  delay?: number
}

/**
 * What an element looks like at one moment: any CSS property, plus `x`, `y` and `blur`. An array is
 * keyframes; `{ value, spring | duration, easing, delay }` gives that one value its own timing.
 */
export type MotionValues = {
  [K in keyof StyleProps]?:
    | StyleProps[K]
    | NonNullable<StyleProps[K]>[]
    | TimedValue<NonNullable<StyleProps[K]>>
}

/** Where an element is: in a swap, `direction` (1 forward, -1 back, 0 neither); in a list, `index`. */
export interface MotionWhere {
  direction: 1 | -1 | 0
  index: number
}

/**
 * Values per part, keyed by the component's part names (its `ui` keys). To depend on a swap's
 * direction or an item's position, give a function: it receives `where`. Shared styles accept
 * plain values only.
 */
export type PartValues<P extends string> = {
  [K in P]?: MotionValues | ((where: MotionWhere) => MotionValues)
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Anything awaitable: a Promise, a GSAP tween, motion's `animate()`. Looser than `PromiseLike` on purpose. */
export interface Thenable {
  then(onfulfilled: () => void): unknown
}

/** Return your animation and vael-ui waits for it, and stops it (`kill`/`stop`/`cancel`) if interrupted. */
export type MotionResult = Thenable | Animation | void

/** What your engine gets: seconds, a CSS easing, and the spring behind it when there is one. */
export interface EngineTiming {
  duration: number
  delay: number
  easing: string
  spring?: Spring
}
/**
 * Animates `el` from `from` to `to` with your library, and returns what it returns, so vael-ui waits
 * for it and stops it when interrupted. Values use vael-ui's names (`x`, `y`, `scale`, `opacity`, any
 * CSS property); `blur` arrives as `filter`.
 */
export type MotionEngine = (
  el: HTMLElement,
  from: Record<string, string | number>,
  to: Record<string, string | number>,
  timing: EngineTiming,
) => MotionResult

export interface MotionContext<N extends string = string> {
  /** Aborts when the motion is interrupted (closed mid-open, reopened mid-close). */
  signal: AbortSignal
  /** Where it grows from, as a `transform-origin` value. */
  origin: string
  reducedMotion: boolean
  /** Your elements, by the names you marked them with; a `v-for` gives several. */
  targets: Record<N, HTMLElement[]>
  /** For swaps: `1` forward, `-1` back, `0` neither. */
  direction: 1 | -1 | 0
}
export interface ListContext<N extends string = string> extends MotionContext<N> {
  /** The item's position, for staggering. */
  index: number
}
export interface MoveContext<N extends string = string> extends MotionContext<N> {
  /** Where it was, relative to where it now sits. */
  from: { x: number; y: number; scaleX: number; scaleY: number }
}

/** Animate the component's parts yourself (GSAP, motion, WAAPI). */
export type MotionHook<P extends string, C> = (
  parts: Record<P, HTMLElement>,
  context: C,
) => MotionResult

// ─── Your elements: targets, chaining, steps ────────────────────────────────

/**
 * A moment of another target or part: when it arrives (default), starts, fully settles, or is a share
 * of the way there in time (`'total:60%'`, measured from its start to its arrival, stagger included).
 */
export type MotionMoment<N extends string> = N | `${N}:start` | `${N}:settle` | `${N}:${number}%`

export type MotionStep<N extends string = string> = MotionTiming & {
  /** Where this step goes. The last step defaults to the element's own resting style. */
  to?: MotionValues
  after?: MotionMoment<N> | MotionMoment<N>[]
  /** Seconds after `after`; negative overlaps it. */
  delay?: number
}

export type TargetMotion<N extends string = string> = MotionTiming & {
  /** Where it comes in from. A function receives `where`: a swap's direction, its index. */
  initial?: MotionValues | ((where: MotionWhere) => MotionValues)
  /**
   * Where it leaves to. A function receives `where`, read as it leaves. Unset, it leaves back the
   * way it came, quieter and quicker; `false` leaves at once.
   */
  exit?: MotionValues | ((where: MotionWhere) => MotionValues) | false
  /**
   * Seconds between the elements under this name. A function gives each its own start, in seconds
   * after the first: `(index, count) => …`, such as outward from the centre of a grid.
   */
  stagger?: number | ((index: number, count: number) => number)
  /** After this moment, or after all of these. Unset: with the component. */
  after?: MotionMoment<N> | MotionMoment<N>[]
  delay?: number
  steps?: MotionStep<N>[]
  /** Find the elements with a selector inside the component instead of marking them. */
  select?: keyof HTMLElementTagNameMap | (string & {})
  /** Limit `select` to one slot. */
  slot?: string
  /** Plays `initial` again whenever this value changes, without remounting the element. */
  replay?: unknown
  /**
   * Elements sharing a `layoutId` are one element moving between places: when one leaves and
   * another arrives in the same moment, the newcomer slides from the old one's box into its own.
   */
  layoutId?: string
  /** Slides to wherever layout puts it (a sibling growing, a list reordering): its position. */
  layout?: boolean
  /** `'visible'`: on its own (no component around it), it appears once scrolled into view. */
  when?: 'mount' | 'visible'
}

// ─── Guards ──────────────────────────────────────────────────────────────────

export interface GuardContext<V = unknown> {
  value: V
  from: V
  to: V
  /** 0–1 through a gesture or hold. */
  progress: number
  /** px/s at the moment of asking, for gestures. */
  velocity: number
}

/** Allows or refuses a commit. The motion stops where it is until the answer comes; refused, it springs back. */
export type MotionGuard<V = unknown> = (context: GuardContext<V>) => boolean | Promise<boolean>

/** What `before-close` gets: why it's closing and, for a dragged sheet, how far and how fast. */
export interface CloseContext<R extends string = string> extends GuardContext<boolean> {
  reason: R
}

/**
 * Allows or refuses a close. Return `true` to close; `false` or nothing keeps it open. A promise
 * holds the overlay until it settles, so `() => confirmAction(…).result` works as is: a dismissed
 * confirm resolves to nothing and keeps it open. A guard that throws or rejects keeps it open too.
 */
export type BeforeClose<R extends string = string> = (
  context: CloseContext<R>,
) => boolean | undefined | Promise<boolean | undefined>

export interface Checkpoint<V = number> {
  /** The value where the motion stops to ask. */
  at: V
  guard: MotionGuard<V>
}

// ─── Linking ─────────────────────────────────────────────────────────────────

/** An element outside the component that follows it. */
export type LinkedMotion = MotionTiming & {
  el: () => Element | null | undefined
  /** Values while the component is open. */
  open?: MotionValues
  /** Values along a gesture or hold, keyed 0–1. */
  progress?: Record<number, MotionValues>
}

// ─── Phase and states ────────────────────────────────────────────────────────

export type MotionPhase = 'entering' | 'entered' | 'leaving' | 'left'

/** Per state: keyframe arrays play once on entering it; plain values are held while it's on. */
export type StateMotion<S extends string, P extends string> = { [K in S]?: PartValues<P> }

// ─── Per-component motion ────────────────────────────────────────────────────

/** What a component offers: its parts, its states, and which kinds of motion it has. */
export interface MotionSpec {
  parts: string
  states?: string
  overlay?: true
  list?: true
  indicator?: true
  swap?: true
  value?: true
}

type Parts<S extends MotionSpec> = S['parts']
type States<S extends MotionSpec> = S['states'] extends string ? S['states'] : never

type HookContext<S extends MotionSpec, N extends string> = MotionContext<NoInfer<N>> &
  (S['list'] extends true ? ListHookContext : unknown)
export interface ListHookContext {
  /** Its place among the items entering together, for your own stagger; `0` when leaving. */
  index: number
}

type BaseMotion<S extends MotionSpec, N extends string> = MotionTiming & {
  /** Appearance: where it comes in from (mount, `v-if`, opening). Opt-in, never on hydration. */
  initial?: PartValues<Parts<S>>
  /** Where it leaves to. Unset: a quiet fade with a slight shrink. */
  exit?: PartValues<Parts<S>>
  /** Your elements inside it, by name. Names are read from these keys only, never from `after`. */
  targets?: { [K in N]?: TargetMotion<NoInfer<N> | Parts<S>> }
  states?: StateMotion<States<S>, Parts<S>>
  enter?: MotionHook<Parts<S>, HookContext<S, N>>
  leave?: MotionHook<Parts<S>, HookContext<S, N>>
  /** Opening: `false` starts on its own instead of after the component it sits in. */
  join?: boolean
  /** Hooks under reduced motion: skipped unless `'run'`. */
  reducedMotion?: 'skip' | 'run'
}

/** Where a morph grows from: the element that opened it, or any element. */
export type MorphFrom = 'trigger' | (() => Element | null | undefined)

type OverlayMotion = {
  /**
   * Grow from the trigger's (or any element's) box and back into it. The trigger hides while
   * open, as if it became the panel; `{ from: 'trigger', hide: false }` keeps it on screen.
   */
  morph?: MorphFrom | { from: MorphFrom; /** @default true */ hide?: boolean }
  /**
   * A layer of shapes above the page and behind the panel: a pill on the trigger and a blob that
   * moves as the panel does, both in the panel's colour. Give it a filter, such as a goo, and the
   * text stays sharp. Popover only. The trigger is cut out of the layer so the real one shows, and
   * the panel goes clear while open.
   */
  surface?: MotionValues
  linked?: Record<string, LinkedMotion>
  /** Closing: `'together'` (default) or `'reverse'`, children first, adding about 300 ms at most. */
  exitOrder?: 'together' | 'reverse'
  /** The panel eases to its content's new size (wizard steps, switched views); `false` snaps to it. */
  resize?: boolean
}
type ListMotion<S extends MotionSpec, N extends string> = {
  stagger?: number
  move?: MotionHook<Parts<S>, MoveContext<N>>
  /** Leaving items: `'pop'` (default) closes the gap at once, `'hold'` keeps it until they're gone. */
  leaving?: 'pop' | 'hold'
}
type IndicatorMotion<S extends MotionSpec, N extends string> = {
  move?: MotionHook<Parts<S>, MoveContext<N>>
}
type SwapMotion = {
  /** `'sync'` (default) cross-fades; `'wait'` lets the old one leave first. */
  swap?: 'sync' | 'wait'
  /**
   * Which way the next swap goes: `1` forward, `-1` back. Values written as functions receive it
   * as `where.direction` when the swap happens, so the view leaving reads the new direction too.
   */
  direction?: 1 | -1 | 0
}
type ValueMotion = {
  /** `'visible'` starts when scrolled into view instead of on mount. */
  when?: 'mount' | 'visible'
}

/** A component's `motion` prop. */
export type ComponentMotion<S extends MotionSpec, N extends string = string> =
  | boolean
  | (BaseMotion<S, N> &
      (S['overlay'] extends true ? OverlayMotion : unknown) &
      (S['list'] extends true ? ListMotion<S, N> : unknown) &
      (S['indicator'] extends true ? IndicatorMotion<S, N> : unknown) &
      (S['swap'] extends true ? SwapMotion : unknown) &
      (S['value'] extends true ? ValueMotion : unknown))

// Exemplars, one per kind; M3–M5 add the rest from each component's `ui` keys and real states.
export type DialogPart =
  | 'overlay'
  | 'panel'
  | 'header'
  | 'title'
  | 'description'
  | 'body'
  | 'footer'
  | 'maximize'
  | 'close'
export type DialogMotion<N extends string = string> = ComponentMotion<
  { parts: DialogPart; overlay: true; swap: true },
  N
>

export type PopoverPart = 'positioner' | 'panel'
export type PopoverMotion<N extends string = string> = ComponentMotion<
  { parts: PopoverPart; overlay: true; swap: true },
  N
>

/** Tooltip's box: values or hooks for its parts, like Popover's. Warm opens stay instant. */
export type TooltipMotion<N extends string = string> = ComponentMotion<
  { parts: PopoverPart; overlay: true },
  N
>

/** Message coming and going: values or hooks for `root`. */
export type MessageMotion<N extends string = string> = ComponentMotion<{ parts: 'root' }, N>

export type MenuPart = 'positioner' | 'panel'
export type MenuMotion<N extends string = string> = ComponentMotion<
  { parts: MenuPart; overlay: true },
  N
>

export type ToasterPart =
  | 'root'
  | 'toast'
  | 'icon'
  | 'content'
  | 'title'
  | 'description'
  | 'action'
  | 'close'
export type ToasterMotion = ComponentMotion<{
  parts: ToasterPart
  states: 'loading' | 'success' | 'error' | 'warning' | 'info'
  list: true
}>

export type TabsPart = 'list' | 'item' | 'indicator'
// Tabs renders no panels (yours, wired with `panelProps`): it moves its indicator, nothing swaps.
export type TabsMotion = ComponentMotion<{ parts: TabsPart; indicator: true }>

export type InputPart = 'root' | 'input' | 'start' | 'end'
export type InputMotion = ComponentMotion<{
  parts: InputPart
  states: 'invalid' | 'disabled' | 'focus'
}>

export type OtpInputPart = 'root'
export type OtpInputMotion = ComponentMotion<{
  parts: OtpInputPart
  states: 'invalid' | 'complete' | 'disabled' | 'focus'
}>

export type FileUploadPart = 'item'
/** FileUpload's rows: values or hooks for `item`, and the list's `stagger` and `leaving`. */
export type FileUploadMotion = ComponentMotion<{ parts: FileUploadPart; list: true }>

export type CommandPalettePart = DialogPart
/** CommandPalette's result rows: values or hooks for `item`, and the list's `stagger`. */
export type CommandPaletteItemsMotion = Exclude<
  ComponentMotion<{ parts: 'item'; list: true }>,
  boolean
>
/** CommandPalette's dialog, like Dialog's. `items` moves the result rows. */
export type CommandPaletteMotion<N extends string = string> =
  DialogMotion<N> extends infer M
    ? M extends boolean
      ? M
      : M & {
          /** The result rows: values or hooks for `item`, and the list's `stagger`. */
          items?: CommandPaletteItemsMotion
        }
    : never

export type SpeedDialPart = 'action'
/** SpeedDial's actions: values or hooks for `action`, the list's `stagger` and `leaving`. */
export type SpeedDialMotion = ComponentMotion<{ parts: SpeedDialPart; list: true }>

/** A select's chips (`multiple`): values or hooks for `chip`, and the list's `stagger` and `leaving`. */
export type ChipsMotion = Exclude<ComponentMotion<{ parts: 'chip'; list: true }>, boolean>
type WithChips<M> = M extends boolean
  ? M
  : M & {
      /** The chips (`multiple`): values or hooks for `chip`, and the list's `stagger` and `leaving`. */
      chips?: ChipsMotion
    }

export type SelectPart = 'positioner' | 'panel'
/** Select's panel: values or hooks for its parts, like Popover's. `chips` moves the chips. */
export type SelectMotion<N extends string = string> = WithChips<
  ComponentMotion<{ parts: SelectPart; overlay: true }, N>
>
/** Combobox's panel: values or hooks for its parts, like Popover's. `chips` moves the chips. */
export type ComboboxMotion<N extends string = string> = SelectMotion<N>
/** CascadeSelect's menu, like Menu's. `chips` moves the chips. */
export type CascadeSelectMotion<N extends string = string> = WithChips<MenuMotion<N>>
/** DatePicker's panel: values or hooks for its parts, like Popover's. */
export type DatePickerMotion<N extends string = string> = ComponentMotion<
  { parts: SelectPart; overlay: true },
  N
>
/** TreeSelect's panel: values or hooks for its parts, like Popover's. */
export type TreeSelectMotion<N extends string = string> = DatePickerMotion<N>

export type TimelinePart =
  | 'item'
  | 'marker'
  | 'connector'
  | 'previousConnector'
  | 'content'
  | 'opposite'
/**
 * Timeline's steps: values or hooks for `item` and its parts (`connector` is missing on the last
 * step, `previousConnector` on the first, `opposite` without the slot), `stagger` and `leaving`.
 */
export type TimelineMotion = ComponentMotion<{ parts: TimelinePart; list: true }>

export type DataTablePart = 'row'
/** DataTable's body rows: values or hooks for `row`, and the list's `stagger`. */
export type DataTableMotion = ComponentMotion<{ parts: DataTablePart; list: true }>

export type CalendarPart = 'label' | 'grid'
/**
 * How Calendar's label and grid change months. Give each part's look as values, or as a
 * function of `where`: its `direction` is `1` going forward and `-1` going back.
 */
export type CalendarMotion =
  | boolean
  | (MotionTiming & { initial?: PartValues<CalendarPart>; exit?: PartValues<CalendarPart> })

export type SliderPart = 'root' | 'track' | 'fill' | 'thumb'
export type SliderMotion = ComponentMotion<{
  parts: SliderPart
  states: 'disabled' | 'focus'
  value: true
}>

export type ButtonPart = 'root' | 'leading' | 'trailing' | 'content' | 'label' | 'badge'
/** `active` is pressed (pointer, Space or Enter); `hover` responds to a mouse only. */
export type ButtonMotion = ComponentMotion<{
  parts: ButtonPart
  states: 'active' | 'hover' | 'focus' | 'loading' | 'disabled'
}>

export type AccordionPart = 'item' | 'header' | 'trigger' | 'chevron' | 'panel' | 'body'
export type AccordionMotion = ComponentMotion<{ parts: AccordionPart; states: 'open' | 'disabled' }>

export type SeparatorPart = 'root' | 'line' | 'text'
export type SeparatorMotion = ComponentMotion<{ parts: SeparatorPart }>

// ─── Every other component: appearance (`initial`), states, and its kind ───

/** Parts that repeat (stars, rows, steps) appear one after another, this many seconds apart. */
type Staggered = { stagger?: number }
type WithStagger<M> = M extends boolean ? M : M & Staggered

export type AnimatedNumberPart = 'root'
/** AnimatedNumber: its appearance, timing for the roll, and `when: 'visible'`. */
export type AnimatedNumberMotion = ComponentMotion<{ parts: AnimatedNumberPart; value: true }>

export type AnimatedTextPart = 'root'
/** AnimatedText: its appearance and the swap's timing. */
export type AnimatedTextMotion = ComponentMotion<{ parts: AnimatedTextPart }>

export type AvatarPart = 'root' | 'image' | 'fallback' | 'badge'
/** Avatar: its parts' appearance, like the image fading in over the fallback. */
export type AvatarMotion = ComponentMotion<{ parts: AvatarPart }>

export type AvatarGroupPart = 'root' | 'avatar'
/** AvatarGroup: its appearance, avatar by avatar. */
export type AvatarGroupMotion = ComponentMotion<{ parts: AvatarGroupPart; list: true }>

export type BadgePart = 'root'
/** Badge: its appearance. */
export type BadgeMotion = ComponentMotion<{ parts: BadgePart }>

export type BreadcrumbPart = 'root' | 'item'
/** Breadcrumb: its appearance, crumb by crumb. */
export type BreadcrumbMotion = ComponentMotion<{ parts: BreadcrumbPart; list: true }>

export type ButtonGroupPart = 'root'
/** ButtonGroup: its appearance; its buttons keep their own `motion`. */
export type ButtonGroupMotion = ComponentMotion<{ parts: ButtonGroupPart }>

export type CardPart = 'root' | 'header' | 'title' | 'description' | 'body' | 'footer'
/** Card: its parts' appearance, and press states on an interactive card. */
export type CardMotion = ComponentMotion<{ parts: CardPart; states: 'active' | 'hover' | 'focus' }>

export type CheckboxPart = 'root' | 'control' | 'indicator' | 'label'
/** Checkbox: its appearance and states. */
export type CheckboxMotion = ComponentMotion<{
  parts: CheckboxPart
  states: 'checked' | 'indeterminate' | 'invalid' | 'disabled' | 'focus' | 'active' | 'hover'
}>

export type ChipPart = 'root' | 'remove'
/** Chip: its appearance and press states. */
export type ChipMotion = ComponentMotion<{
  parts: ChipPart
  states: 'disabled' | 'focus' | 'active' | 'hover'
}>

export type CollapsiblePart = 'root' | 'trigger' | 'panel'
/** Collapsible: its appearance and states. */
export type CollapsibleMotion = ComponentMotion<{
  parts: CollapsiblePart
  states: 'open' | 'disabled'
}>

export type DialPart = 'root' | 'track' | 'fill' | 'face' | 'ticks'
/** Dial: its appearance, states and the fill's timing. */
export type DialMotion = ComponentMotion<{
  parts: DialPart
  states: 'disabled' | 'focus' | 'active'
}>

export type DockPart = 'root' | 'item'
/** Dock: its appearance, item by item. */
export type DockMotion = WithStagger<ComponentMotion<{ parts: DockPart }>>

export type EditablePart = 'root' | 'preview' | 'edit' | 'input' | 'actions'
/** Editable: its appearance and states. */
export type EditableMotion = ComponentMotion<{
  parts: EditablePart
  states: 'editing' | 'disabled' | 'focus'
}>

export type FieldPart = 'root' | 'label' | 'control' | 'description' | 'error'
/** Field: its parts' appearance and states. */
export type FieldMotion = ComponentMotion<{
  parts: FieldPart
  states: 'invalid' | 'disabled' | 'focus'
}>

export type InputNumberPart = 'root' | 'input' | 'increment' | 'decrement'
/** InputNumber: its appearance and states. */
export type InputNumberMotion = ComponentMotion<{
  parts: InputNumberPart
  states: 'invalid' | 'disabled' | 'focus'
}>

export type KbdPart = 'root'
/** Kbd: its appearance. */
export type KbdMotion = ComponentMotion<{ parts: KbdPart }>

export type KnobPart = 'root' | 'track' | 'fill' | 'indicator'
/** Knob: its appearance, states and the fill's timing. */
export type KnobMotion = ComponentMotion<{
  parts: KnobPart
  states: 'disabled' | 'focus' | 'active'
}>

export type LoaderPart = 'root'
/** Loader: its appearance; `false` holds it still. */
export type LoaderMotion = ComponentMotion<{ parts: LoaderPart }>

export type PasswordInputPart = 'root' | 'input' | 'toggle' | 'hint'
/** PasswordInput: its appearance and states. */
export type PasswordInputMotion = ComponentMotion<{
  parts: PasswordInputPart
  states: 'invalid' | 'disabled' | 'focus'
}>

export type ProgressPart = 'root' | 'track' | 'fill' | 'legend'
/** Progress: its appearance, states, and the fill's timing and `when: 'visible'`. */
export type ProgressMotion = ComponentMotion<{
  parts: ProgressPart
  states: 'complete' | 'indeterminate'
  value: true
}>

export type PullToRefreshPart = 'root' | 'indicator'
/** PullToRefresh: its appearance and states. */
export type PullToRefreshMotion = ComponentMotion<{
  parts: PullToRefreshPart
  states: 'pulling' | 'refreshing'
}>

export type RadioPart = 'root' | 'control' | 'label' | 'description'
/** Radio: its appearance and states. */
export type RadioMotion = ComponentMotion<{
  parts: RadioPart
  states: 'checked' | 'invalid' | 'disabled' | 'focus' | 'active' | 'hover'
}>

export type RadioGroupPart = 'root'
/** RadioGroup: its appearance; its radios keep their own `motion`. */
export type RadioGroupMotion = ComponentMotion<{ parts: RadioGroupPart }>

export type RatingPart = 'root' | 'item'
/** Rating: its appearance, star by star, and states. */
export type RatingMotion = WithStagger<
  ComponentMotion<{ parts: RatingPart; states: 'disabled' | 'focus' }>
>

export type ResizablePart = 'root' | 'handle'
/** Resizable: its appearance and states. */
export type ResizableMotion = ComponentMotion<{ parts: ResizablePart; states: 'dragging' }>

export type ScrollAreaPart = 'root'
/** ScrollArea: its appearance. */
export type ScrollAreaMotion = ComponentMotion<{ parts: ScrollAreaPart }>

export type SkeletonPart = 'root'
/** Skeleton: its appearance; `false` holds the pulse still. */
export type SkeletonMotion = ComponentMotion<{ parts: SkeletonPart }>

export type SortablePart = 'root' | 'item'
/** Sortable: its appearance, row by row, and states. */
export type SortableMotion = WithStagger<
  ComponentMotion<{ parts: SortablePart; states: 'dragging' | 'settling' }>
>

export type StepperPart = 'root' | 'step' | 'circle' | 'connector' | 'content'
/** Stepper: its parts' appearance, step by step. */
export type StepperMotion = WithStagger<ComponentMotion<{ parts: StepperPart }>>

export type SwipeToRevealPart = 'root' | 'content' | 'actions'
/** SwipeToReveal: its appearance and states. */
export type SwipeToRevealMotion = ComponentMotion<{
  parts: SwipeToRevealPart
  states: 'open' | 'dragging'
}>

export type SwitchPart = 'root' | 'track' | 'thumb'
/** Switch: its appearance and states. */
export type SwitchMotion = ComponentMotion<{
  parts: SwitchPart
  states: 'checked' | 'invalid' | 'disabled' | 'focus' | 'active' | 'hover' | 'dragging'
}>

export type TagPart = 'root'
/** Tag: its appearance and press states. */
export type TagMotion = ComponentMotion<{
  parts: TagPart
  states: 'focus' | 'active' | 'hover'
}>

export type TextareaPart = 'root' | 'textarea'
/** Textarea: its appearance and states. */
export type TextareaMotion = ComponentMotion<{
  parts: TextareaPart
  states: 'invalid' | 'disabled' | 'focus'
}>

export type TreePart = 'list' | 'node' | 'chevron' | 'label'
/** Tree: its appearance, row by row. */
export type TreeMotion = WithStagger<ComponentMotion<{ parts: TreePart }>>

export type MenuListPart = 'root' | 'item' | 'indicator'
/** MenuList: its appearance, and how the current-page indicator moves. */
export type MenuListMotion = WithStagger<ComponentMotion<{ parts: MenuListPart; indicator: true }>>

export type PaginationPart = 'root' | 'button' | 'indicator'
/** Pagination: its appearance, and how the current-page indicator moves. */
export type PaginationMotion = WithStagger<
  ComponentMotion<{ parts: PaginationPart; indicator: true }>
>

export type SelectButtonPart = 'root' | 'option' | 'indicator'
/** SelectButton: its appearance, and how the selection moves. */
export type SelectButtonMotion = WithStagger<
  ComponentMotion<{ parts: SelectButtonPart; states: 'disabled'; indicator: true }>
>

export type ToolbarPart = 'root' | 'item' | 'indicator'
/** Toolbar: its appearance, and how the hover highlight moves. */
export type ToolbarMotion = WithStagger<ComponentMotion<{ parts: ToolbarPart; indicator: true }>>

export type ColorPickerPart = 'swatch' | 'positioner' | 'panel'
/** ColorPicker: the swatch's appearance and states, and the panel like Popover's. */
export type ColorPickerMotion = ComponentMotion<{
  parts: ColorPickerPart
  states: 'disabled'
  overlay: true
}>

// ─── App-wide style (ConfigProvider `motion`) ────────────────────────────────

/** An SVG filter as data. Rendered once by ConfigProvider; reference it as `url(#name)`. */
export interface MotionFilter {
  /** Gaussian blur radius. */
  blur?: number
  /** Alpha sharpening `[multiplier, offset]`, the classic goo. */
  contrast?: [number, number]
}

type RoleValues = MotionTiming & { initial?: MotionValues; exit?: MotionValues }

export interface MotionStyle {
  /** Schema version, so a style outlives releases. */
  version: 1
  spring?: Spring
  /** Your animation library behind vael-ui's values, for components inside. Code only, never data. */
  engine?: MotionEngine
  filters?: Record<string, MotionFilter>
  reducedMotion?: 'user' | 'always' | 'never'
  overlay?: RoleValues & {
    morph?: 'trigger' | { from: 'trigger'; hide?: boolean }
    surface?: MotionValues
    exitOrder?: 'together' | 'reverse'
    swap?: 'sync' | 'wait'
    resize?: boolean
  }
  list?: RoleValues & { stagger?: number; leaving?: 'pop' | 'hold' }
  reveal?: RoleValues
  indicator?: MotionTiming & { style?: MotionValues }
  press?: MotionTiming & { active?: MotionValues; hover?: MotionValues }
  toggle?: MotionTiming
  value?: MotionTiming & { when?: 'mount' | 'visible' }
  resize?: MotionTiming
  content?: TargetMotion
  gesture?: MotionTiming
  /** Presets for `v-animate`, by name. */
  presets?: Record<string, TargetMotion>
  /** Per-component overrides, beating the role. */
  dialog?: Exclude<DialogMotion, boolean>
  popover?: Exclude<PopoverMotion, boolean>
  menu?: Exclude<MenuMotion, boolean>
  toaster?: Exclude<ToasterMotion, boolean>
  tabs?: Exclude<TabsMotion, boolean>
  input?: Exclude<InputMotion, boolean>
  otpInput?: Exclude<OtpInputMotion, boolean>
  calendar?: Exclude<CalendarMotion, boolean>
  fileUpload?: Exclude<FileUploadMotion, boolean>
  commandPalette?: Exclude<CommandPaletteMotion, boolean>
  speedDial?: Exclude<SpeedDialMotion, boolean>
  dataTable?: Exclude<DataTableMotion, boolean>
  select?: Exclude<SelectMotion, boolean>
  combobox?: Exclude<ComboboxMotion, boolean>
  cascadeSelect?: Exclude<CascadeSelectMotion, boolean>
  datePicker?: Exclude<DatePickerMotion, boolean>
  tooltip?: Exclude<TooltipMotion, boolean>
  message?: Exclude<MessageMotion, boolean>
  treeSelect?: Exclude<TreeSelectMotion, boolean>
  timeline?: Exclude<TimelineMotion, boolean>
  button?: Exclude<ButtonMotion, boolean>
  accordion?: Exclude<AccordionMotion, boolean>
  slider?: Exclude<SliderMotion, boolean>
  animatedNumber?: Exclude<AnimatedNumberMotion, boolean>
  animatedText?: Exclude<AnimatedTextMotion, boolean>
  avatar?: Exclude<AvatarMotion, boolean>
  avatarGroup?: Exclude<AvatarGroupMotion, boolean>
  badge?: Exclude<BadgeMotion, boolean>
  breadcrumb?: Exclude<BreadcrumbMotion, boolean>
  buttonGroup?: Exclude<ButtonGroupMotion, boolean>
  card?: Exclude<CardMotion, boolean>
  checkbox?: Exclude<CheckboxMotion, boolean>
  chip?: Exclude<ChipMotion, boolean>
  collapsible?: Exclude<CollapsibleMotion, boolean>
  dial?: Exclude<DialMotion, boolean>
  dock?: Exclude<DockMotion, boolean>
  editable?: Exclude<EditableMotion, boolean>
  field?: Exclude<FieldMotion, boolean>
  inputNumber?: Exclude<InputNumberMotion, boolean>
  kbd?: Exclude<KbdMotion, boolean>
  knob?: Exclude<KnobMotion, boolean>
  loader?: Exclude<LoaderMotion, boolean>
  passwordInput?: Exclude<PasswordInputMotion, boolean>
  progress?: Exclude<ProgressMotion, boolean>
  pullToRefresh?: Exclude<PullToRefreshMotion, boolean>
  radio?: Exclude<RadioMotion, boolean>
  radioGroup?: Exclude<RadioGroupMotion, boolean>
  rating?: Exclude<RatingMotion, boolean>
  resizable?: Exclude<ResizableMotion, boolean>
  scrollArea?: Exclude<ScrollAreaMotion, boolean>
  skeleton?: Exclude<SkeletonMotion, boolean>
  sortable?: Exclude<SortableMotion, boolean>
  stepper?: Exclude<StepperMotion, boolean>
  swipeToReveal?: Exclude<SwipeToRevealMotion, boolean>
  switch?: Exclude<SwitchMotion, boolean>
  tag?: Exclude<TagMotion, boolean>
  textarea?: Exclude<TextareaMotion, boolean>
  tree?: Exclude<TreeMotion, boolean>
  menuList?: Exclude<MenuListMotion, boolean>
  pagination?: Exclude<PaginationMotion, boolean>
  selectButton?: Exclude<SelectButtonMotion, boolean>
  toolbar?: Exclude<ToolbarMotion, boolean>
  colorPicker?: Exclude<ColorPickerMotion, boolean>
  separator?: Exclude<SeparatorMotion, boolean>
}

// ─── Your own components and the directive ─────────────────────────────────

export type MotionRole = 'overlay' | 'list' | 'reveal' | 'content'

/** What `useMotion(role, motion)` takes: your part names, and the keys of that role. */
export type OwnMotion<R extends MotionRole, N extends string = string> = Exclude<
  ComponentMotion<
    { parts: string } & (R extends 'overlay'
      ? { overlay: true; swap: true }
      : R extends 'list'
        ? { list: true }
        : { swap: true }),
    N
  >,
  boolean
>

/** A function ref: bind it with `:ref`, on an element or a component (its root element is used). */
export type MotionRef = (el: Element | ComponentPublicInstance | null) => void

/** `N`: your component's target names, so `target('…')` autocompletes for whoever fills its slot. */
export interface UseMotionReturn<N extends string = string> {
  /** Bind to Vue's `<Transition>` or `<TransitionGroup>`. */
  transition: TransitionProps
  /** A function ref for one of your component's parts. */
  part: (name: string) => MotionRef
  /** A function ref for your elements, by name. */
  target: (name: N) => MotionRef
  readonly phase: MotionPhase
}

/** `v-animate:name="value"`: a preset name or values. */
export type AnimateDirectiveValue = string | TargetMotion

/** Validates a style from outside your code (settings, a database, the network). */
export type ParseMotionStyle = (input: unknown) => { style: MotionStyle; issues: string[] }
