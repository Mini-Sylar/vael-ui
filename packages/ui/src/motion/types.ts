// The motion API contract (plans/008, plans/009 M0). Types only; the runtime implements them.
import type { ComponentPublicInstance, CSSProperties, TransitionProps } from 'vue'
import type { SpringName } from '../composables/springNames'
import type { BuiltinPreset } from './presets'
import type { IndicatorSpring, IndicatorStretch } from '../composables/useTabIndicator'

// ─── Vocabulary ──────────────────────────────────────────────────────────────

/** A spring. `damping` 1 settles without overshoot, below 1 it bounces; `response` is roughly the seconds to arrive. */
export type Spring = IndicatorSpring

export type { SpringName }
export type { BuiltinPreset }

/** vael-ui's easing tokens, by name (`'out'`) or as the CSS variable. */
export type UiEase =
  | 'out'
  | 'in-out'
  | 'drawer'
  | 'pop'
  | 'bounce'
  | 'text'
  | 'var(--ui-ease-out)'
  | 'var(--ui-ease-in-out)'
  | 'var(--ui-ease-drawer)'
  | 'var(--ui-ease-pop)'
  | 'var(--ui-ease-bounce)'
  | 'var(--ui-ease-toast)'
  | 'var(--ui-ease-indicator)'
  | 'var(--ui-ease-number)'
  | 'var(--ui-ease-text)'

/** vael-ui's duration tokens, by name (`'enter'`) or as the CSS variable. Any number of milliseconds works too. */
export type UiDuration =
  | 'press'
  | 'enter'
  | 'exit'
  | 'drawer'
  | 'drawer-exit'
  | 'tooltip'
  | 'tooltip-exit'
  | 'toast'
  | 'toast-exit'
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
  | {
      /**
       * A spring by name (`'snappy'`, `'smooth'`, `'bouncy'`, `'gentle'`), or its numbers: `damping`
       * below 1 overshoots, `response` is roughly its length in seconds.
       */
      spring?: Spring | SpringName
      duration?: PickOne
      easing?: PickOne
    }
  | {
      spring?: PickOne
      /** Milliseconds, or a `--ui-duration-*` token. */
      duration?: number | UiDuration
      /** A CSS easing, or a token by name (`'out'`, `'pop'`). */
      easing?: UiEase | (string & {})
    }

type Length = number | (string & {})
interface Shorthands {
  /** Moves along the inline axis, in px when a number. Mirrors in right-to-left layouts. */
  x?: Length
  /** Moves along the block axis, in px when a number. */
  y?: Length
  /** `filter: blur()`, in px when a number. */
  blur?: Length
  /** Turns it, in degrees when a number: `rotate: 90`. */
  rotate?: number | (string & {})
}
type StyleProps = Omit<CSSProperties, keyof Shorthands> & Shorthands

/** One value with its own timing: `y: { value: 12, spring: { damping: 0.4, response: 0.5 } }`. */
export type TimedValue<V> = (
  | MotionTiming
  | {
      spring?: PickOne
      duration?: number | UiDuration
      /** Keyframes: one easing per step between them, such as a quick rise, then `'bouncy'` to settle. A step takes CSS, a token by name or a spring. */
      easing: (UiEase | SpringName | Spring | (string & {}))[]
    }
) & {
  value: V | V[]
  /** Seconds before this value starts, on top of the element's own delay. */
  delay?: number
  /** Keyframes: where each one falls, from 0 to 1 (`[0, 0.3, 1]`). Unset, they're evenly spaced. */
  times?: number[]
  /** Keyframes: plays this many more times; `Infinity` loops until the element or state goes. */
  repeat?: number
  /** Keyframes, repeating: `'loop'` starts over each time; `'reverse'` plays back and forth. */
  repeatType?: 'loop' | 'reverse'
}

/**
 * What an element looks like at one moment: any CSS property, plus `x`, `y` and `blur`. A plain number
 * is px, or degrees for `rotate`, except where CSS takes a bare number (`opacity`, `scale`). An array
 * is keyframes; `{ value, spring | duration, easing, delay }` gives that one value its own timing.
 */
export type MotionValues = {
  [K in keyof StyleProps]?:
    | StyleProps[K]
    | NonNullable<StyleProps[K]>[]
    | TimedValue<NonNullable<StyleProps[K]>>
}

/** Where an element is: in a swap, `direction` (1 forward, -1 back, 0 neither); in a list, `index`. */
export interface MotionWhere {
  /** In a swap: `1` forward, `-1` back, `0` neither. */
  direction: 1 | -1 | 0
  /** In a list or a group: its position. */
  index: number
  /** In a list or a group: how many there are, or how many come or go together. */
  count?: number
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
  /** Seconds. */
  duration: number
  /** Seconds before it starts. */
  delay: number
  /** A CSS easing, a spring's included (as `linear()`). */
  easing: string
  /** The spring behind `easing`, for a library with springs of its own. */
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

/** What your `enter` and `leave` hooks get, besides the elements. */
export interface MotionContext<N extends string = string> {
  /** Aborts when the motion is interrupted (closed mid-open, reopened mid-close). */
  signal: AbortSignal
  /** Where it grows from, as a `transform-origin` value. */
  origin: string
  /** The user prefers reduced motion: hooks run anyway only with `reducedMotion: 'run'`. */
  reducedMotion: boolean
  /** Your elements, by the names you marked them with; a `v-for` gives several. */
  targets: Record<N, HTMLElement[]>
  /** For swaps: `1` forward, `-1` back, `0` neither. */
  direction: 1 | -1 | 0
}
/** What a list's hooks get: the context, and the item's place. */
export interface ListContext<N extends string = string> extends MotionContext<N> {
  /** The item's position, for staggering. */
  index: number
}
/** What a `move` hook gets: the context, and where the element came from. */
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

/** Where a stagger's wave starts, other than the first element. */
export type StaggerFrom = 'end' | 'center' | 'edges'

/**
 * Elements one after another: `true` spaces them by the stagger token (40ms) in page order;
 * `'end'`, `'center'` or `'edges'` start the wave there instead. A number is the seconds between
 * them; a function gives each its own start: `(index, count) => seconds`.
 */
export type Stagger = boolean | StaggerFrom | number | ((index: number, count: number) => number)

export type TargetMotion<N extends string = string> = MotionTiming & {
  /** Where it comes in from. A function receives `where`: a swap's direction, its index. */
  initial?: MotionValues | ((where: MotionWhere) => MotionValues)
  /**
   * Where it leaves to. A function receives `where`, read as it leaves. Unset, it leaves back the
   * way it came, quieter and quicker; `false` leaves at once.
   */
  exit?: MotionValues | ((where: MotionWhere) => MotionValues) | false
  /** The elements under this name one after another, in page order (see `Stagger`). */
  stagger?: Stagger
  /** After this moment, or after all of these. Unset: with the component. */
  after?: MotionMoment<N> | MotionMoment<N>[]
  delay?: number
  steps?: MotionStep<N>[]
  /** Find the elements with a selector inside the component instead of marking them. */
  select?: keyof HTMLElementTagNameMap | (string & {})
  /** Plays `initial` again whenever this value changes, without remounting the element. */
  replay?: unknown
  /**
   * Elements sharing a `layoutId` are one element moving between places: when one leaves and
   * another arrives in the same moment, the newcomer slides from the old one's box into its own.
   */
  layoutId?: string
  /**
   * Slides to wherever layout puts it (a sibling growing, a list reordering). With `layoutId`,
   * `'position'` travels without resizing on the way, so text never stretches.
   */
  layout?: boolean | 'position'
  /** `'visible'`: on its own (no component around it), it appears once scrolled into view. */
  when?: 'mount' | 'visible'
}

// ─── Guards ──────────────────────────────────────────────────────────────────

/** What a guard gets: the change it's asked about. */
export interface GuardContext<V = unknown> {
  /** The value now. */
  value: V
  /** Where the change started. */
  from: V
  /** Where it would land if allowed. */
  to: V
  /** 0–1 through a gesture or hold. */
  progress: number
  /** px/s at the moment of asking, for gestures. */
  velocity: number
}

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

// ─── Linking ─────────────────────────────────────────────────────────────────

/** An element outside the component that follows it. */
export type LinkedMotion = MotionTiming & {
  /** The element, read when it opens (a getter, so a ref or a query that isn't there yet works). */
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
  /** It comes and goes on its own (Message, your `useMotion('reveal')`): it has an exit and hooks. */
  presence?: true
  /** It moves other elements with it while open (Dialog, Drawer, BottomSheet). */
  linked?: true
  list?: true
  indicator?: true
  /** Its indicator is a pill that can stretch and squash as it moves. */
  stretch?: true
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

type BaseMotion<S extends MotionSpec> = MotionTiming & {
  /** Appearance: where it comes in from (mount, `v-if`, opening). Opt-in, never on hydration. */
  initial?: PartValues<Parts<S>>
  states?: StateMotion<States<S>, Parts<S>>
}
/** What only something that comes and goes has: where it leaves to, and hooks for both ways. */
type PresenceMotion<S extends MotionSpec, N extends string> = {
  /** Where it leaves to. Unset: a quiet fade with a slight shrink. */
  exit?: PartValues<Parts<S>>
  enter?: MotionHook<Parts<S>, HookContext<S, N>>
  leave?: MotionHook<Parts<S>, HookContext<S, N>>
  /** Hooks under reduced motion: skipped unless `'run'`. */
  reducedMotion?: 'skip' | 'run'
}
type TargetsMotion<S extends MotionSpec, N extends string> = {
  /** Your elements inside it, by name. Names are read from these keys only, never from `after`. */
  targets?: { [K in N]?: TargetMotion<NoInfer<N> | Parts<S>> }
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
  /** Closing: `'together'` (default) or `'reverse'`, children first, adding about 200 ms at most. */
  exitOrder?: 'together' | 'reverse'
  /** The panel eases to its content's new size (wizard steps, switched views); `false` snaps to it. */
  resize?: boolean
}
type ListMotion = {
  /** New items one after another (see `Stagger`). @default 0.03 */
  stagger?: Stagger
  /** Leaving items: `'pop'` (default) closes the gap at once, `'hold'` keeps it until they're gone. */
  leaving?: 'pop' | 'hold'
  /** Also enters the items already there when the list mounts, such as each time a palette opens. Hydration never plays it. @default false */
  appear?: boolean
}
type IndicatorMotion<S extends MotionSpec, N extends string> = {
  move?: MotionHook<Parts<S>, MoveContext<N>>
}
type StretchMotion = {
  /** The indicator stretches as it moves: the edge facing the move leaves first and the other
   * follows on a softer spring. An object tunes that edge's spring (`trail`) and its `delay` in seconds. */
  stretch?: boolean | IndicatorStretch
  /** The cross-axis scale the indicator starts each move from (`0.82`), springing back to 1. */
  squash?: number
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
type LinkedMotions = {
  /** Elements outside it that move with it while it's open, by a name you choose. */
  linked?: Record<string, LinkedMotion>
}
type ValueMotion = {
  /** `'visible'` starts when scrolled into view instead of on mount. */
  when?: 'mount' | 'visible'
}

/** A component's `motion` prop. */
export type ComponentMotion<S extends MotionSpec, N extends string = string> =
  | boolean
  | (BaseMotion<S> &
      (S['overlay'] extends true
        ? OverlayMotion & PresenceMotion<S, N> & TargetsMotion<S, N>
        : unknown) &
      (S['presence'] extends true ? PresenceMotion<S, N> & TargetsMotion<S, N> : unknown) &
      (S['linked'] extends true ? LinkedMotions : unknown) &
      (S['list'] extends true ? ListMotion & PresenceMotion<S, N> : unknown) &
      (S['indicator'] extends true ? IndicatorMotion<S, N> : unknown) &
      (S['stretch'] extends true ? StretchMotion : unknown) &
      (S['swap'] extends true ? SwapMotion & { exit?: PartValues<Parts<S>> } : unknown) &
      (S['value'] extends true ? ValueMotion : unknown) &
      (S['overlay'] extends true
        ? unknown
        : S['presence'] extends true
          ? unknown
          : S['list'] extends true
            ? unknown
            : ReplayMotion))

/** What a component that's always on the page has: its appearance, played again. */
type ReplayMotion = {
  /** A repeated part's elements (Rating's stars, Progress's segments) come in one after another. */
  stagger?: Stagger
  /** Plays its `initial` again whenever this value changes, without remounting: a burst on a pick. */
  replay?: unknown
  /** `false`: its `initial` doesn't play when it mounts, only on `replay`. @default true */
  appear?: boolean
}

// Exemplars, one per kind; M3–M5 add the rest from each component's `ui` keys and real states.
/** Dialog's parts, by their `ui` names: the elements its `motion` can animate. */
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
/**
 * Dialog's `motion`, and Drawer's and BottomSheet's: values or hooks for its parts (DialogPart), how
 * it opens and closes (`morph`, `linked`, `exitOrder`, `resize`) and swapped content. `false` turns
 * it off.
 */
export type DialogMotion<N extends string = string> = ComponentMotion<
  { parts: DialogPart; overlay: true; swap: true; linked: true },
  N
>

/** Popover's parts, by their `ui` names: the elements its `motion` can animate. */
export type PopoverPart = 'positioner' | 'panel'
/**
 * Popover's `motion`: values or hooks for `positioner` and `panel`, how it opens and closes (`morph`,
 * `surface`, `resize`) and swapped content. `false` turns it off.
 */
export type PopoverMotion<N extends string = string> = ComponentMotion<
  { parts: PopoverPart; overlay: true; swap: true },
  N
>

/**
 * Tour's `motion`: the callout opens and closes like Popover's. Its timing, `{ duration, easing }` or
 * `{ spring }`, also sets how the spotlight and the callout glide between steps. Unset, the glide is
 * quick to a nearby target and longer across the screen. `false` turns it all off.
 */
export type TourMotion<N extends string = string> = PopoverMotion<N>

/** Tooltip's box: values or hooks for its parts, like Popover's. Warm opens stay instant. */
export type TooltipMotion<N extends string = string> = ComponentMotion<
  { parts: PopoverPart; overlay: true },
  N
>

/** Message coming and going: values or hooks for `root`. */
export type MessageMotion<N extends string = string> = ComponentMotion<
  { parts: 'root'; presence: true },
  N
>

/** Menu's parts, by their `ui` names: the elements its `motion` can animate. */
export type MenuPart = 'positioner' | 'panel'
/**
 * Menu's `motion`, and ContextMenu's and SplitButton's: values or hooks for `positioner` and `panel`,
 * and how it opens and closes. `false` turns it off.
 */
export type MenuMotion<N extends string = string> = ComponentMotion<
  { parts: MenuPart; overlay: true },
  N
>

/** Toaster's parts, by their `ui` names: the elements its `motion` can animate. */
export type ToasterPart =
  | 'root'
  | 'toast'
  | 'icon'
  | 'content'
  | 'title'
  | 'description'
  | 'action'
  | 'close'
/** Toaster's `motion`: values or hooks for its parts (ToasterPart), its states (`loading`, `success`, `error`, `warning`, `info`), how its items come and go (`stagger`, `leaving`, `appear`). `false` turns it off. */
export type ToasterMotion = ComponentMotion<{
  parts: ToasterPart
  states: 'loading' | 'success' | 'error' | 'warning' | 'info'
  list: true
}>

/** Tabs's parts, by their `ui` names: the elements its `motion` can animate. */
export type TabsPart = 'list' | 'item' | 'indicator'
// Tabs renders no panels (yours, wired with `panelProps`): it moves its indicator, nothing swaps.
/** Tabs's `motion`: values or hooks for its parts (TabsPart), how its indicator moves (a `move` hook). `false` turns it off. */
export type TabsMotion = ComponentMotion<{ parts: TabsPart; indicator: true; stretch: true }>

/** Input's parts, by their `ui` names: the elements its `motion` can animate. */
export type InputPart = 'root' | 'input' | 'start' | 'end'
/** Input's `motion`: values or hooks for its parts (InputPart), its states (`invalid`, `disabled`, `focus`). `false` turns it off. */
export type InputMotion = ComponentMotion<{
  parts: InputPart
  states: 'invalid' | 'disabled' | 'focus'
}>

/** OtpInput's parts, by their `ui` names: the elements its `motion` can animate. */
export type OtpInputPart = 'root' | 'cell'
/**
 * OtpInput's `motion`: its parts (OtpInputPart) and states (`invalid`, `complete`, `disabled`,
 * `focus`). Each cell plays them on its own, plus `filled` and `current` (the caret's); give a
 * cell's values as a function to use its `index`. `false` turns it off.
 */
export type OtpInputMotion = ComponentMotion<{
  parts: OtpInputPart
  states: 'invalid' | 'complete' | 'disabled' | 'focus' | 'filled' | 'current'
}>

/** FileUpload's parts, by their `ui` names: the elements its `motion` can animate. */
export type FileUploadPart = 'item'
/** FileUpload's rows: values or hooks for `item`, and the list's `stagger` and `leaving`. */
export type FileUploadMotion = ComponentMotion<{ parts: FileUploadPart; list: true }>

/** CommandPalette's parts, by their `ui` names: the elements its `motion` can animate. */
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

/** SpeedDial's parts, by their `ui` names: the elements its `motion` can animate. */
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

/** Select's parts, by their `ui` names: the elements its `motion` can animate. */
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

/** Timeline's parts, by their `ui` names: the elements its `motion` can animate. */
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

/** DataTable's parts, by their `ui` names: the elements its `motion` can animate. */
export type DataTablePart = 'row'
/** DataTable's body rows: values or hooks for `row`, and the list's `stagger`. */
export type DataTableMotion = ComponentMotion<{ parts: DataTablePart; list: true }>

/** Calendar's parts, by their `ui` names: the elements its `motion` can animate. */
export type CalendarPart = 'label' | 'grid'
/**
 * How Calendar's label and grid change months. Give each part's look as values, or as a
 * function of `where`: its `direction` is `1` going forward and `-1` going back.
 */
export type CalendarMotion =
  | boolean
  | (MotionTiming & { initial?: PartValues<CalendarPart>; exit?: PartValues<CalendarPart> })

/** Slider's parts, by their `ui` names: the elements its `motion` can animate. */
export type SliderPart = 'root' | 'track' | 'fill' | 'thumb'
/** Slider's `motion`: values or hooks for its parts (SliderPart), its states (`disabled`, `focus`), how its value changes. `false` turns it off. */
export type SliderMotion = ComponentMotion<{
  parts: SliderPart
  states: 'disabled' | 'focus'
  value: true
}>

/** Button's parts, by their `ui` names: the elements its `motion` can animate. */
export type ButtonPart = 'root' | 'leading' | 'trailing' | 'content' | 'label' | 'badge'
/** `active` is pressed (pointer, Space or Enter); `hover` responds to a mouse only. */
export type ButtonMotion = ComponentMotion<{
  parts: ButtonPart
  states: 'active' | 'hover' | 'focus' | 'loading' | 'disabled'
}>

/** Accordion's parts, by their `ui` names: the elements its `motion` can animate. */
export type AccordionPart = 'item' | 'header' | 'trigger' | 'chevron' | 'panel' | 'body'
/** Accordion's `motion`: values or hooks for its parts (AccordionPart), its states (`open`, `disabled`). `false` turns it off. */
export type AccordionMotion = ComponentMotion<{ parts: AccordionPart; states: 'open' | 'disabled' }>

/** Separator's parts, by their `ui` names: the elements its `motion` can animate. */
export type SeparatorPart = 'root' | 'line' | 'text'
/** Separator's `motion`: values or hooks for its parts (SeparatorPart). `false` turns it off. */
export type SeparatorMotion = ComponentMotion<{ parts: SeparatorPart }>

// ─── Every other component: appearance (`initial`), states, and its kind ───

/** Parts that repeat (stars, rows, steps) appear one after another, this many seconds apart. */
type Staggered = { stagger?: Stagger }
type WithStagger<M> = M extends boolean ? M : M & Staggered

/** AnimatedNumber's parts, by their `ui` names: the elements its `motion` can animate. */
export type AnimatedNumberPart = 'root'
/** AnimatedNumber: its appearance, timing for the roll, and `when: 'visible'`. */
export type AnimatedNumberMotion = ComponentMotion<{ parts: AnimatedNumberPart; value: true }>

/** AnimatedText's parts, by their `ui` names: the elements its `motion` can animate. */
export type AnimatedTextPart = 'root'
/** AnimatedText: its appearance and the swap's timing. */
export type AnimatedTextMotion = ComponentMotion<{ parts: AnimatedTextPart }>

/** Avatar's parts, by their `ui` names: the elements its `motion` can animate. */
export type AvatarPart = 'root' | 'image' | 'fallback' | 'badge'
/** Avatar: its parts' appearance, like the image fading in over the fallback. */
export type AvatarMotion = ComponentMotion<{ parts: AvatarPart }>

/** AvatarGroup's parts, by their `ui` names: the elements its `motion` can animate. */
export type AvatarGroupPart = 'root' | 'avatar'
/** AvatarGroup: its appearance, avatar by avatar. */
export type AvatarGroupMotion = ComponentMotion<{ parts: AvatarGroupPart; list: true }>

/** Badge's parts, by their `ui` names: the elements its `motion` can animate. */
export type BadgePart = 'root'
/** Badge: its appearance. */
export type BadgeMotion = ComponentMotion<{ parts: BadgePart }>

/** Breadcrumb's parts, by their `ui` names: the elements its `motion` can animate. */
export type BreadcrumbPart = 'root' | 'item'
/** Breadcrumb: its appearance, crumb by crumb. */
export type BreadcrumbMotion = ComponentMotion<{ parts: BreadcrumbPart; list: true }>

/** ButtonGroup's parts, by their `ui` names: the elements its `motion` can animate. */
export type ButtonGroupPart = 'root'
/** ButtonGroup: its appearance; its buttons keep their own `motion`. */
export type ButtonGroupMotion = ComponentMotion<{ parts: ButtonGroupPart }>

/** Card's parts, by their `ui` names: the elements its `motion` can animate. */
export type CardPart = 'root' | 'header' | 'title' | 'description' | 'body' | 'footer'
/** Card: its parts' appearance, and press states on an interactive card. */
export type CardMotion = ComponentMotion<{ parts: CardPart; states: 'active' | 'hover' | 'focus' }>

/** Checkbox's parts, by their `ui` names: the elements its `motion` can animate. */
export type CheckboxPart = 'root' | 'control' | 'indicator' | 'label'
/** Checkbox: its appearance and states. */
export type CheckboxMotion = ComponentMotion<{
  parts: CheckboxPart
  states:
    | 'checked'
    | 'unchecked'
    | 'indeterminate'
    | 'invalid'
    | 'disabled'
    | 'focus'
    | 'active'
    | 'hover'
}>

/** Chip's parts, by their `ui` names: the elements its `motion` can animate. */
export type ChipPart = 'root' | 'remove'
/** Chip: its appearance and press states. */
export type ChipMotion = ComponentMotion<{
  parts: ChipPart
  states: 'disabled' | 'focus' | 'active' | 'hover'
}>

/** Collapsible's parts, by their `ui` names: the elements its `motion` can animate. */
export type CollapsiblePart = 'root' | 'trigger' | 'panel'
/** Collapsible: its appearance and states. */
export type CollapsibleMotion = ComponentMotion<{
  parts: CollapsiblePart
  states: 'open' | 'disabled'
}>

/** Dial's parts, by their `ui` names: the elements its `motion` can animate. */
export type DialPart = 'root' | 'track' | 'fill' | 'face' | 'ticks'
/** Dial: its appearance, states and the fill's timing. */
export type DialMotion = ComponentMotion<{
  parts: DialPart
  states: 'disabled' | 'focus' | 'active'
}>

/** Dock's parts, by their `ui` names: the elements its `motion` can animate. */
export type DockPart = 'root' | 'item'
/**
 * Dock: its appearance, item by item, and each item's states: `hover`, `active` (pressed), `focus`,
 * and `selected`, which plays each time the item is picked (a launch hop). Its `spring` is the one
 * magnification follows the pointer on, overshoot included.
 */
export type DockMotion = WithStagger<
  ComponentMotion<{
    parts: DockPart
    states: 'hover' | 'active' | 'focus' | 'disabled' | 'selected'
  }>
>

/** Editable's parts, by their `ui` names: the elements its `motion` can animate. */
export type EditablePart = 'root' | 'preview' | 'edit' | 'input' | 'actions'
/** Editable: its appearance and states. */
export type EditableMotion = ComponentMotion<{
  parts: EditablePart
  states: 'editing' | 'disabled' | 'focus'
}>

/** Field's parts, by their `ui` names: the elements its `motion` can animate. */
export type FieldPart = 'root' | 'label' | 'control' | 'description' | 'error'
/** Field: its parts' appearance and states. */
export type FieldMotion = ComponentMotion<{
  parts: FieldPart
  states: 'invalid' | 'disabled' | 'focus'
}>

/** InputNumber's parts, by their `ui` names: the elements its `motion` can animate. */
export type InputNumberPart = 'root' | 'input' | 'increment' | 'decrement'
/** InputNumber: its appearance and states. */
export type InputNumberMotion = ComponentMotion<{
  parts: InputNumberPart
  states: 'invalid' | 'disabled' | 'focus'
}>

/** Kbd's parts, by their `ui` names: the elements its `motion` can animate. */
export type KbdPart = 'root'
/** Kbd: its appearance. */
export type KbdMotion = ComponentMotion<{ parts: KbdPart }>

/** Knob's parts, by their `ui` names: the elements its `motion` can animate. */
export type KnobPart = 'root' | 'track' | 'fill' | 'indicator'
/** Knob: its appearance, states and the fill's timing. */
export type KnobMotion = ComponentMotion<{
  parts: KnobPart
  states: 'disabled' | 'focus' | 'active'
}>

/** Loader's parts, by their `ui` names: the elements its `motion` can animate. */
export type LoaderPart = 'root'
/** Loader: its appearance; `false` holds it still. */
export type LoaderMotion = ComponentMotion<{ parts: LoaderPart }>

/** PasswordInput's parts, by their `ui` names: the elements its `motion` can animate. */
export type PasswordInputPart = 'root' | 'input' | 'toggle' | 'hint'
/** PasswordInput: its appearance and states. */
export type PasswordInputMotion = ComponentMotion<{
  parts: PasswordInputPart
  states: 'invalid' | 'disabled' | 'focus'
}>

/** Progress's parts, by their `ui` names: the elements its `motion` can animate. */
export type ProgressPart = 'root' | 'track' | 'fill' | 'legend'
/** Progress: its appearance, states, and the fill's timing and `when: 'visible'`. */
export type ProgressMotion = ComponentMotion<{
  parts: ProgressPart
  states: 'complete' | 'indeterminate'
  value: true
}>

/** PullToRefresh's parts, by their `ui` names: the elements its `motion` can animate. */
export type PullToRefreshPart = 'root' | 'indicator'
/** PullToRefresh: its appearance and states. */
export type PullToRefreshMotion = ComponentMotion<{
  parts: PullToRefreshPart
  states: 'pulling' | 'refreshing'
}>

/** Radio's parts, by their `ui` names: the elements its `motion` can animate. */
export type RadioPart = 'root' | 'control' | 'label' | 'description'
/** Radio: its appearance and states. */
export type RadioMotion = ComponentMotion<{
  parts: RadioPart
  states: 'checked' | 'unchecked' | 'invalid' | 'disabled' | 'focus' | 'active' | 'hover'
}>

/** RadioGroup's parts, by their `ui` names: the elements its `motion` can animate. */
export type RadioGroupPart = 'root'
/** RadioGroup: its appearance; its radios keep their own `motion`. */
export type RadioGroupMotion = ComponentMotion<{ parts: RadioGroupPart }>

/** Rating's parts, by their `ui` names: the elements its `motion` can animate. */
export type RatingPart = 'root' | 'item'
/** Rating: its appearance, star by star, and states. */
export type RatingMotion = WithStagger<
  ComponentMotion<{ parts: RatingPart; states: 'disabled' | 'focus' }>
>

/** Resizable's parts, by their `ui` names: the elements its `motion` can animate. */
export type ResizablePart = 'root' | 'handle'
/** Resizable: its appearance and states. */
export type ResizableMotion = ComponentMotion<{ parts: ResizablePart; states: 'dragging' }>

/** ScrollArea's parts, by their `ui` names: the elements its `motion` can animate. */
export type ScrollAreaPart = 'root'
/** ScrollArea: its appearance. */
export type ScrollAreaMotion = ComponentMotion<{ parts: ScrollAreaPart }>

/** Skeleton's parts, by their `ui` names: the elements its `motion` can animate. */
export type SkeletonPart = 'root'
/** Skeleton: its appearance; `false` holds the pulse still. */
export type SkeletonMotion = ComponentMotion<{ parts: SkeletonPart }>

/** Sortable's parts, by their `ui` names: the elements its `motion` can animate. */
export type SortablePart = 'root' | 'item'
/** Sortable: its appearance, row by row, and states. */
export type SortableMotion = WithStagger<
  ComponentMotion<{ parts: SortablePart; states: 'dragging' | 'settling' }>
>

/** Stepper's parts, by their `ui` names: the elements its `motion` can animate. */
export type StepperPart = 'root' | 'step' | 'circle' | 'connector' | 'content'
/**
 * Stepper: its parts' appearance and their states, step by step. Each step, circle and line plays
 * its own: `current`, `completed` or `upcoming` (a line is `completed` once it's filled).
 */
export type StepperMotion = WithStagger<
  ComponentMotion<{
    parts: StepperPart
    states: 'current' | 'completed' | 'upcoming' | 'disabled' | 'hover' | 'focus'
  }>
>

/** SwipeToReveal's parts, by their `ui` names: the elements its `motion` can animate. */
export type SwipeToRevealPart = 'root' | 'content' | 'actions'
/** SwipeToReveal: its appearance and states. */
export type SwipeToRevealMotion = ComponentMotion<{
  parts: SwipeToRevealPart
  states: 'open' | 'dragging'
}>

/** Switch's parts, by their `ui` names: the elements its `motion` can animate. */
export type SwitchPart = 'root' | 'track' | 'thumb'
/** Switch: its appearance and states. */
export type SwitchMotion = ComponentMotion<{
  parts: SwitchPart
  states:
    | 'checked'
    | 'unchecked'
    | 'invalid'
    | 'disabled'
    | 'focus'
    | 'active'
    | 'hover'
    | 'dragging'
}>

/** Tag's parts, by their `ui` names: the elements its `motion` can animate. */
export type TagPart = 'root'
/** Tag: its appearance and press states. */
export type TagMotion = ComponentMotion<{
  parts: TagPart
  states: 'focus' | 'active' | 'hover'
}>

/** Textarea's parts, by their `ui` names: the elements its `motion` can animate. */
export type TextareaPart = 'root' | 'textarea'
/** Textarea: its appearance and states. */
export type TextareaMotion = ComponentMotion<{
  parts: TextareaPart
  states: 'invalid' | 'disabled' | 'focus'
}>

/** Tree's parts, by their `ui` names: the elements its `motion` can animate. */
export type TreePart = 'list' | 'node' | 'chevron' | 'label'
/** Tree: its appearance, row by row. */
export type TreeMotion = WithStagger<ComponentMotion<{ parts: TreePart }>>

/** MenuList's parts, by their `ui` names: the elements its `motion` can animate. */
export type MenuListPart = 'root' | 'item' | 'indicator'
/** MenuList: its appearance, and how the current-page indicator moves. */
export type MenuListMotion = WithStagger<ComponentMotion<{ parts: MenuListPart; indicator: true }>>

/** Pagination's parts, by their `ui` names: the elements its `motion` can animate. */
export type PaginationPart = 'root' | 'button' | 'indicator'
/** Pagination: its appearance, and how the current-page indicator moves. */
export type PaginationMotion = WithStagger<
  ComponentMotion<{ parts: PaginationPart; indicator: true; stretch: true }>
>

/** SelectButton's parts, by their `ui` names: the elements its `motion` can animate. */
export type SelectButtonPart = 'root' | 'option' | 'indicator'
/** SelectButton: its appearance, and how the selection moves. */
export type SelectButtonMotion = WithStagger<
  ComponentMotion<{
    parts: SelectButtonPart
    states: 'disabled'
    indicator: true
    stretch: true
  }>
>

/** Toolbar's parts, by their `ui` names: the elements its `motion` can animate. */
export type ToolbarPart = 'root' | 'item' | 'indicator'
/** Toolbar: its appearance, and how the hover highlight moves. */
export type ToolbarMotion = WithStagger<ComponentMotion<{ parts: ToolbarPart; indicator: true }>>

/** ColorPicker's parts, by their `ui` names: the elements its `motion` can animate. */
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
  /** Every component's spring inside: a name (`'bouncy'`) or `{ damping, response }`. */
  spring?: Spring | SpringName
  /** Your animation library behind vael-ui's values, for components inside. Code only, never data. */
  engine?: MotionEngine
  filters?: Record<string, MotionFilter>
  overlay?: RoleValues & {
    morph?: 'trigger' | { from: 'trigger'; hide?: boolean }
    surface?: MotionValues
    exitOrder?: 'together' | 'reverse'
    swap?: 'sync' | 'wait'
    resize?: boolean
  }
  list?: RoleValues & {
    stagger?: number | boolean | StaggerFrom
    leaving?: 'pop' | 'hold'
    appear?: boolean
  }
  reveal?: RoleValues
  press?: MotionTiming & { active?: MotionValues; hover?: MotionValues }
  content?: TargetMotion
  /** Presets for `v-animate`, by name. */
  presets?: Record<string, TargetMotion>
  /** Per-component overrides, beating the role. */
  /** A style is data: `linked` reads elements, so it's set on the component, not here. */
  dialog?: Omit<Exclude<DialogMotion, boolean>, 'linked'>
  popover?: Exclude<PopoverMotion, boolean>
  /** Tour's glide between steps: a spring, or a duration with an easing. Its callout follows `popover`. */
  tour?: MotionTiming
  menu?: Exclude<MenuMotion, boolean>
  toaster?: Exclude<ToasterMotion, boolean>
  tabs?: Exclude<TabsMotion, boolean>
  input?: Exclude<InputMotion, boolean>
  otpInput?: Exclude<OtpInputMotion, boolean>
  calendar?: Exclude<CalendarMotion, boolean>
  fileUpload?: Exclude<FileUploadMotion, boolean>
  commandPalette?: Omit<Exclude<CommandPaletteMotion, boolean>, 'linked'>
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
        : { presence: true; swap: true }),
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
/**
 * Your own `v-animate` presets by name, so they autocomplete and work as modifiers
 * (`v-animate.wiggle`). Add them where you declare your app's types:
 * `declare module 'vael-ui' { interface MotionPresets { wiggle: true } }`.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- filled in by your app
export interface MotionPresets {}

/** A preset by name: a built-in entrance (`fade`, `rise`, `drop`, `pop`, `blur`) or one of yours. */
export type PresetName = BuiltinPreset | keyof MotionPresets

/** `v-animate`'s `states`: a look per state, held while it's on. */
export type AnimateStates = Partial<Record<'hover' | 'active' | 'focus', MotionValues>>

/** What `v-animate`'s modifiers pick: an entrance, a spring, `stagger`, or `size`. */
export type AnimateModifier = PresetName | SpringName | 'stagger' | 'size'

export type AnimateDirectiveValue =
  // Until you list your presets in MotionPresets, any name is accepted (and checked as it plays).
  | PresetName
  | ([keyof MotionPresets] extends [never] ? string & {} : never)
  | (TargetMotion & {
      /**
       * A look it holds while bound, moving to each new one as it changes, from wherever it is on
       * screen: `animate: { rotate: open ? 180 : 0 }`. Keyframe arrays play once per change, or
       * loop with `repeat`.
       */
      animate?: MotionValues
      /**
       * `false`: no entrance when it mounts; `replay` and its exit still play. `'later'`: no
       * entrance for what's there when its component first renders (inside a vael-ui component,
       * when it opens), but one for anything mounted after, such as a row added to a list.
       * @default true
       */
      appear?: boolean | 'later'
      /**
       * Looks it holds while hovered (a mouse), pressed (`active`: pointer, Space or Enter) or
       * focused, as a component's `states`: `{ hover: { scale: 1.03 }, active: { scale: 0.97 } }`.
       */
      states?: AnimateStates
      /**
       * With keyframe arrays in `animate`: holds them at this point, from 0 to 1, instead of
       * playing them, so a swipe or a scroll scrubs them: `progress: swipe.progress`. With a
       * `spring`, they follow it on that spring instead of at once.
       */
      progress?: number
    })

/** Validates a style from outside your code (settings, a database, the network). */
export type ParseMotionStyle = (input: unknown) => { style: MotionStyle; issues: string[] }
