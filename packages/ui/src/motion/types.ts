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

/** Values per part, keyed by the component's part names (its `ui` keys). */
export type PartValues<P extends string> = { [K in P]?: MotionValues }

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Anything awaitable: a Promise, a GSAP tween, motion's `animate()`. Looser than `PromiseLike` on purpose. */
export interface Thenable {
  then(onfulfilled: () => void): unknown
}

/** Return your animation and vael-ui waits for it, and stops it (`kill`/`stop`/`cancel`) if interrupted. */
export type MotionResult = Thenable | Animation | void

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
  initial?: MotionValues
  exit?: MotionValues
  /** Seconds between the elements under this name. */
  stagger?: number
  /** After this moment, or after all of these. Unset: with the component. */
  after?: MotionMoment<N> | MotionMoment<N>[]
  delay?: number
  steps?: MotionStep<N>[]
  /** Find the elements with a selector inside the component instead of marking them. */
  select?: keyof HTMLElementTagNameMap | (string & {})
  /** Limit `select` to one slot. */
  slot?: string
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

/** Allow or refuse a commit. While it's pending the motion holds; refused, it springs back. */
export type MotionGuard<V = unknown> = (context: GuardContext<V>) => boolean | Promise<boolean>

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

type BaseMotion<S extends MotionSpec, N extends string> = MotionTiming & {
  /** Appearance: where it comes in from (mount, `v-if`, opening). Opt-in, never on hydration. */
  initial?: PartValues<Parts<S>>
  /** Where it leaves to. Unset: a quiet fade with a slight shrink. */
  exit?: PartValues<Parts<S>>
  /** Your elements inside it, by name. Names are read from these keys only, never from `after`. */
  targets?: { [K in N]?: TargetMotion<NoInfer<N> | Parts<S>> }
  states?: StateMotion<States<S>, Parts<S>>
  enter?: MotionHook<Parts<S>, MotionContext<NoInfer<N>>>
  leave?: MotionHook<Parts<S>, MotionContext<NoInfer<N>>>
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
  /** A shapes-only layer behind trigger and panel; filters here never touch text. */
  surface?: MotionValues
  linked?: Record<string, LinkedMotion>
  /** Closing: `'together'` (default) or `'reverse'`, children first, capped at ~300ms. */
  exitOrder?: 'together' | 'reverse'
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
  { parts: DialogPart; overlay: true },
  N
>

export type PopoverPart = 'positioner' | 'panel'
export type PopoverMotion<N extends string = string> = ComponentMotion<
  { parts: PopoverPart; overlay: true },
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
export type TabsMotion = ComponentMotion<{ parts: TabsPart; indicator: true; swap: true }>

export type InputPart = 'root' | 'input' | 'start' | 'end'
export type InputMotion = ComponentMotion<{
  parts: InputPart
  states: 'invalid' | 'disabled' | 'focus'
}>

export type SliderPart = 'root' | 'track' | 'fill' | 'thumb'
export type SliderMotion = ComponentMotion<{
  parts: SliderPart
  states: 'disabled' | 'focus'
  value: true
}>

export type SeparatorPart = 'root' | 'line' | 'text'
export type SeparatorMotion = ComponentMotion<{ parts: SeparatorPart }>

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
  filters?: Record<string, MotionFilter>
  reducedMotion?: 'user' | 'always' | 'never'
  overlay?: RoleValues & {
    morph?: 'trigger' | { from: 'trigger'; hide?: boolean }
    surface?: MotionValues
    exitOrder?: 'together' | 'reverse'
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
  toaster?: Exclude<ToasterMotion, boolean>
  tabs?: Exclude<TabsMotion, boolean>
  input?: Exclude<InputMotion, boolean>
  slider?: Exclude<SliderMotion, boolean>
}

// ─── Your own components and the directive ─────────────────────────────────

export type MotionRole = 'overlay' | 'list' | 'reveal' | 'content'

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
