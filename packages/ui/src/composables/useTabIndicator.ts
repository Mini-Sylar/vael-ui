import { inject, nextTick, onBeforeUnmount, onMounted, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref, WatchSource } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import type { ElRef } from './dom'
import { defaultsKey } from '../config'
import type { SpringHandle, SpringOptions } from './useSpringValue'
import { DEFAULT_DAMPING, DEFAULT_RESPONSE } from './springStep'

// The spring engine loads only for an indicator set to a spring, fetched as soon as one is.
let springs$: typeof import('./useSpringValue') | undefined
let loadingSprings: Promise<unknown> | undefined
const loadSprings = () =>
  (loadingSprings ??= import('./useSpringValue').then((m) => (springs$ = m)))
// A stretch or squash's own springs, for the indicators that set one.
let stretch$: typeof import('./indicatorStretch') | undefined
let loadingStretch: Promise<unknown> | undefined
const loadStretch = () =>
  (loadingStretch ??= import('./indicatorStretch').then((m) => (stretch$ = m)))
import { prefersReducedMotion } from './dom'

/**
 * How a sliding indicator moves: `'glide'` (a CSS transition, the default), `'instant'`, or a
 * spring, given as `{ damping, response }` (see `createSpring`). Below 1, damping overshoots.
 */
export type IndicatorMode = 'glide' | 'instant' | IndicatorSpring
export type IndicatorSpring = Pick<SpringOptions, 'damping' | 'response'>

/** How a stretching indicator's trailing edge follows the leading one. */
export interface IndicatorStretch {
  /** The trailing edge's spring. Unset, a slightly softer and bouncier copy of the leading one. */
  trail?: IndicatorSpring
  /** Seconds the trailing edge waits before it follows. @default 0.05 */
  delay?: number
}

export interface UseTabIndicatorOptions {
  listEl: ElRef<HTMLElement | null>
  /** Must match the `Tabs` instance's own `orientation` — same axis, same keys. */
  orientation?: MaybeRefOrGetter<'horizontal' | 'vertical'>
  /** The active element to measure inside `listEl`. Defaults to Tabs' own shape; SelectButton passes `'[data-checked]'` to reuse the same sliding technique for its single-select indicator. */
  selector?: MaybeRefOrGetter<string>
  /** Default `'bounds'`: sets real `insetInlineStart`/`inlineSize` (or the block equivalents) in px — a small layout cost on measure, but border-radius computes against the indicator's true size and it renders identically regardless of the display's pixel ratio. `'transform'` instead does compositor-only `translate`+`scale` off a 1px CSS baseline — cheaper, but a border-radius on the SCALED axis is computed against that pre-transform 1px box (clamped to ~0.5px per the spec's own corner-radius-vs-edge-length rule) and only THEN stretched, so any indicator needing a real two-axis rounded pill renders a flattened/sharp corner on that axis instead of a proper curve, and on a fractional device-pixel-ratio display (common on Windows) the scale can round unevenly enough to look visibly misaligned. Only reach for `'transform'` when the indicator has no rounded corners on the scaled axis and the extra compositor-only cheapness genuinely matters. */
  sizing?: MaybeRefOrGetter<'transform' | 'bounds'>
  /** `listEl` scrolls and the indicator scrolls inside it (a listbox): positions are measured in its scrolled coordinates. `'bounds'` sizing only. */
  scroller?: boolean
  /** Also match the active element on the cross axis (a list row inset by the list's padding). `'bounds'` sizing only. */
  matchCross?: boolean
  /** A move longer than this many of the active element's own lengths jumps instead of gliding (typeahead, Home/End, a filtered list). `'bounds'` sizing only. */
  maxGlide?: MaybeRefOrGetter<number | undefined>
  /** `false` moves the indicator at once, every time, for an animation of your own. */
  motion?: MaybeRefOrGetter<boolean | undefined>
  /** How it moves. Unset, it follows the nearest ConfigProvider's `indicator`, else `'glide'`. A spring needs `indicatorEl`. `'bounds'` sizing only. */
  indicator?: MaybeRefOrGetter<IndicatorMode | undefined>
  /** The indicator element, which a spring writes to directly each frame instead of re-rendering. */
  indicatorEl?: ElRef<HTMLElement | null>
  /** `'translate'` moves the indicator with `translate` from the list's top-left corner, which the
   * compositor animates without layout; its CSS must pin `top: 0; left: 0` and transition
   * `translate`. `'bounds'` sizing only. @default 'inset' */
  position?: 'inset' | 'translate'
  /** Its two edges move on their own springs, so it stretches in flight: the edge facing the move
   * leads and the other trails. Moves on a spring even when `indicator` is `'glide'`. `'inset'` position only. */
  stretch?: MaybeRefOrGetter<boolean | IndicatorStretch | undefined>
  /** The cross-axis scale it starts each move from (`0.82`), springing back to 1. Needs `indicatorEl`. */
  squash?: MaybeRefOrGetter<number | undefined>
}

export interface UseTabIndicatorReturn {
  /** Inline style for a sibling indicator element. Default (`sizing: 'bounds'`): sets real `insetInlineStart`/`inlineSize` (or block equivalents) in px. With `sizing: 'transform'`, `translate` positions it at the active tab's edge and `scale` resizes it to match instead — both compositor-only, never `inlineSize`/`blockSize`; pairs with the `.ui-tabs-indicator` CSS, which pins the element to a 1px baseline on the scaled axis — see the option's own doc. Bind directly: `:style="style"`. */
  style: Ref<Record<string, string | undefined>>
  /** Re-measures before the next paint; several calls in one go measure once. */
  update: () => void
}

const camelCase = (name: string) => name.replace(/-(\w)/g, (_, char: string) => char.toUpperCase())

export function useTabIndicator(
  active: WatchSource<unknown>,
  options: UseTabIndicatorOptions,
): UseTabIndicatorReturn {
  const style = shallowRef<Record<string, string | undefined>>({})
  const provided = inject(defaultsKey, undefined)
  const mode = (): IndicatorMode =>
    toValue(options.indicator) ?? provided?.value.indicator ?? 'glide'
  // Unset, a ConfigProvider's `motion: false` turns it off too, springs included.
  const motionOff = () =>
    (toValue(options.motion) ?? provided?.value.motion) === false || mode() === 'instant'
  // The spring it moves on: its own, or for a stretch or squash the engine's default.
  const lead = (): IndicatorSpring | undefined => {
    const now = mode()
    if (typeof now === 'object') return now
    return toValue(options.stretch) || toValue(options.squash) !== undefined ? {} : undefined
  }
  // A spring set: its engine is fetched once mounted, long before anything moves (until then it
  // glides). Not in setup: a component may set this up before its own props exist.
  onMounted(() =>
    watch(
      () => lead() && [lead(), toValue(options.stretch)],
      // Arrived: measured once more, so its springs start where it rests and the next move glides.
      (now) =>
        !!now &&
        void Promise.all([
          loadSprings(),
          (toValue(options.stretch) || toValue(options.squash) !== undefined) && loadStretch(),
        ]).then(() => update()),
      { immediate: true },
    ),
  )
  // One spring per measured property, writing it straight to the element.
  const springs = new Map<string, SpringHandle>()
  let springKey = ''
  let measuredOnce = false
  // Tracks whether a real match has ever been positioned, separately from
  // measuredOnce — lets the first real selection (from "nothing selected")
  // skip only the position/size transition, not the opacity fade.
  let hasAppeared = false
  let lastStart: number | undefined

  function measure() {
    const list = options.listEl.value
    const selector = toValue(options.selector) ?? '[role="tab"][aria-selected="true"]'
    const tab = list?.querySelector<HTMLElement>(selector)
    if (!list) return
    // Only an indicator about to appear can be inside an ancestor that is still animating in.
    if (!hasAppeared) remeasureAfterAncestorTransitions(list)
    if (!tab) {
      // A list that loses its highlight shows the next one where it lands, not sliding in.
      if (toValue(options.maxGlide) !== undefined) {
        lastStart = undefined
        hasAppeared = false
      }
      write({ ...current(), opacity: '0' })
      measuredOnce = true
      return
    }
    const listRect = list.getBoundingClientRect()
    const tabRect = tab.getBoundingClientRect()
    // Undo any ancestor scale (e.g. a Dialog still animating in) so px values match layout size.
    // offsetWidth is rounded to whole px, so only treat a real (>1px) mismatch as a scale.
    const scaleX =
      list.offsetWidth && Math.abs(listRect.width - list.offsetWidth) > 1
        ? listRect.width / list.offsetWidth
        : 1
    const scaleY =
      list.offsetHeight && Math.abs(listRect.height - list.offsetHeight) > 1
        ? listRect.height / list.offsetHeight
        : 1
    const left = (tabRect.left - listRect.left) / scaleX + (options.scroller ? list.scrollLeft : 0)
    const top = (tabRect.top - listRect.top) / scaleY + (options.scroller ? list.scrollTop : 0)
    const width = tabRect.width / scaleX
    const height = tabRect.height / scaleY
    const vertical = toValue(options.orientation) === 'vertical'
    // No transition on first paint; no position/size transition on first
    // appearance either (its resting size is 0, so it would visibly grow
    // in from the edge instead of fading in already at the right spot).
    const firstPaint = !measuredOnce
    const firstAppearance = !hasAppeared
    measuredOnce = true
    hasAppeared = true
    if (toValue(options.sizing) === 'transform') {
      const transitionDuration = firstPaint ? '0ms' : firstAppearance ? '0ms, 0ms' : undefined
      apply(
        vertical
          ? { translate: `0 ${top}px`, scale: `1 ${height}`, transitionDuration }
          : { translate: `${left}px 0`, scale: `${width} 1`, transitionDuration },
      )
      return
    }
    // getBoundingClientRect measures the border box, but an absolutely
    // positioned child's inset-* resolves against the containing block's
    // PADDING box — a container with its own border (SelectButton's track)
    // needs that border subtracted or the indicator lands one border-width
    // further along than the option it's supposed to match exactly.
    const { borderInlineStart, borderBlockStart, rtl } = bordersOf(list)
    // inset-inline-start counts from the right in a right-to-left list.
    const inlineStart = rtl
      ? (listRect.right - tabRect.right) / scaleX - (options.scroller ? list.scrollLeft : 0)
      : left
    const start = vertical ? top - borderBlockStart : inlineStart - borderInlineStart
    const length = vertical ? height : width
    const maxGlide = toValue(options.maxGlide)
    const tooFar =
      maxGlide !== undefined &&
      lastStart !== undefined &&
      Math.abs(start - lastStart) > length * maxGlide
    lastStart = start
    const currentMode = lead()
    const el = options.indicatorEl?.value
    const springing = !!currentMode && !!el && !motionOff() && !!springs$
    const transitionDuration =
      firstPaint || motionOff()
        ? '0ms'
        : firstAppearance || tooFar
          ? `0ms, 0ms, var(--ui-duration-press)`
          : undefined
    if (options.position === 'translate') {
      const { borderLeft, borderTop } = bordersOf(list)
      const x = vertical && !options.matchCross ? 0 : left - borderLeft
      const y = !vertical && !options.matchCross ? 0 : top - borderTop
      const sizes: Record<string, number> = vertical
        ? { 'block-size': height }
        : { 'inline-size': width }
      if (options.matchCross)
        sizes[vertical ? 'inline-size' : 'block-size'] = vertical ? width : height
      if (springing) {
        const jump = firstPaint || firstAppearance || tooFar || reducedMotion()
        spring(
          el!,
          currentMode as IndicatorSpring,
          { 'translate-x': x, 'translate-y': y, ...sizes },
          jump,
        )
        return
      }
      const next: Record<string, string | undefined> = {
        translate: `${x}px ${y}px`,
        transitionDuration,
      }
      for (const [property, value] of Object.entries(sizes))
        next[camelCase(property)] = `${value}px`
      apply(next)
      return
    }
    const geometry: Record<string, number> = vertical
      ? { 'inset-block-start': start, 'block-size': height }
      : { 'inset-inline-start': start, 'inline-size': width }
    if (options.matchCross) {
      if (vertical) {
        geometry['inset-inline-start'] = inlineStart - borderInlineStart
        geometry['inline-size'] = width
      } else {
        geometry['inset-block-start'] = top - borderBlockStart
        geometry['block-size'] = height
      }
    }
    if (springing) {
      spring(
        el!,
        currentMode as IndicatorSpring,
        geometry,
        firstPaint || firstAppearance || tooFar || reducedMotion(),
      )
      return
    }
    // transitionDuration's order matches the transition-property list; a partial
    // override still needs a value per slot, so opacity's restates the CSS.
    const cross = options.matchCross
      ? vertical
        ? { insetInlineStart: `${inlineStart - borderInlineStart}px`, inlineSize: `${width}px` }
        : { insetBlockStart: `${top - borderBlockStart}px`, blockSize: `${height}px` }
      : {}
    apply(
      vertical
        ? {
            insetBlockStart: `${start}px`,
            blockSize: `${height}px`,
            ...cross,
            transitionDuration,
          }
        : {
            insetInlineStart: `${start}px`,
            inlineSize: `${width}px`,
            ...cross,
            transitionDuration,
          },
    )
  }

  function spring(
    el: HTMLElement,
    config: IndicatorSpring,
    geometry: Record<string, number>,
    jump: boolean,
  ) {
    const stretch = options.position === 'translate' ? undefined : toValue(options.stretch)
    // Unset, the trailing edge is a little softer and bouncier than the leading one.
    const trail = stretch
      ? (stretch !== true && stretch.trail) || {
          damping: (config.damping ?? DEFAULT_DAMPING) * 0.75,
          response: (config.response ?? DEFAULT_RESPONSE) * 1.25,
        }
      : undefined
    if (stretch$) stretcher ??= stretch$.createIndicatorStretch()
    // The stretch's own springs arriving starts the set afresh, so no plain edge spring lingers.
    const key =
      `${config.damping ?? ''}/${config.response ?? ''}` +
      (trail ? `/${trail.damping ?? ''}/${trail.response ?? ''}` : '') +
      (stretcher ? '/s' : '')
    const fresh = key !== springKey
    if (fresh) {
      dropSprings()
      springKey = key
    }
    const shape = Object.values(geometry).join()
    const moved = !fresh && !jump && shape !== lastShape
    lastShape = shape
    const vertical = toValue(options.orientation) === 'vertical'
    const owned = Object.keys(geometry).map((key) =>
      key.startsWith('translate-') ? 'translate' : camelCase(key),
    )
    if (trail && stretcher) {
      const startKey = vertical ? 'inset-block-start' : 'inset-inline-start'
      const sizeKey = vertical ? 'block-size' : 'inline-size'
      const { [startKey]: start, [sizeKey]: size, ...rest } = geometry
      const delay = typeof stretch === 'object' ? (stretch.delay ?? 0.05) : 0.05
      stretcher.stretchTo(el, config, trail, delay, {
        startKey,
        sizeKey,
        to: [start!, start! + size!],
        jump,
      })
      geometry = rest
    }
    stretcher?.squash(el, toValue(options.squash), trail ?? config, { moved, jump, vertical })
    // translate-x and translate-y share one `translate`, written from both springs' current values.
    const writeTranslate = () =>
      (el.style.translate = `${springs.get('translate-x')?.value ?? 0}px ${springs.get('translate-y')?.value ?? 0}px`)
    for (const [property, value] of Object.entries(geometry)) {
      let handle = springs.get(property)
      if (!handle) {
        handle = springs$!.createSpring(value, config, (next) =>
          property.startsWith('translate-')
            ? writeTranslate()
            : el.style.setProperty(property, `${next}px`),
        )
        springs.set(property, handle)
        handle.jump(value)
        continue
      }
      if (jump) handle.jump(value)
      else handle.set(value)
    }
    // The springs own position and size; the style keeps only the opacity fade.
    write({ transitionProperty: 'opacity' }, owned)
  }

  // A stretch or squash, once its springs have loaded.
  let stretcher: ReturnType<NonNullable<typeof stretch$>['createIndicatorStretch']> | undefined
  let lastShape = ''
  function dropSprings() {
    springs.forEach((handle) => handle.destroy())
    springs.clear()
    stretcher?.drop()
  }

  // Same geometry keeps a pending `0ms`: the ResizeObserver's first callback lands in the
  // mount frame, and dropping it there slides the indicator in from its CSS default.
  function apply(next: Record<string, string | undefined>) {
    const prev = current()
    const unchanged =
      prev.opacity === undefined &&
      Object.keys(next).every((key) => key === 'transitionDuration' || prev[key] === next[key])
    if (!unchanged) write(next)
  }

  // With the indicator element in hand, styles go straight onto it, like motion-v does: a hover
  // never re-renders the component that owns the list. Without it, the bound `style` carries them.
  let written: Record<string, string | undefined> = {}
  // The element `written` was written to: a new one (a menu opened again) starts bare.
  let writtenTo: HTMLElement | undefined
  function current(): Record<string, string | undefined> {
    const el = options.indicatorEl?.value
    return el ? (el === writtenTo ? written : {}) : style.value
  }
  function write(next: Record<string, string | undefined>, keep: string[] = []) {
    const el = options.indicatorEl?.value
    if (!el) {
      style.value = next
      return
    }
    if (el !== writtenTo) {
      written = {}
      writtenTo = el
    }
    if (Object.keys(style.value).length) style.value = {}
    const css = el.style as unknown as Record<string, string>
    for (const key of new Set([...Object.keys(written), ...Object.keys(next)])) {
      if (keep.includes(key)) continue
      const value = next[key] ?? ''
      if ((written[key] ?? '') !== value) css[key] = value
    }
    written = { ...next }
  }

  // Border widths change only with a resize, which the ResizeObserver below reports.
  type Borders = Record<
    'borderInlineStart' | 'borderBlockStart' | 'borderLeft' | 'borderTop',
    number
  > & { rtl: boolean }
  const borders = new WeakMap<HTMLElement, Borders>()
  function bordersOf(list: HTMLElement): Borders {
    let cached = borders.get(list)
    if (!cached) {
      const listStyle = getComputedStyle(list)
      cached = {
        borderInlineStart: parseFloat(listStyle.borderInlineStartWidth) || 0,
        borderBlockStart: parseFloat(listStyle.borderBlockStartWidth) || 0,
        borderLeft: parseFloat(listStyle.borderLeftWidth) || 0,
        borderTop: parseFloat(listStyle.borderTopWidth) || 0,
        rtl: listStyle.direction === 'rtl',
      }
      borders.set(list, cached)
    }
    return cached
  }

  // In a frame callback the measure rides the browser's own style pass instead of forcing one in
  // the pointer event. A hidden page gets no frames, so there a microtask runs it.
  let frame = 0
  let queued = false
  function update() {
    if (frame || queued) return
    if (typeof requestAnimationFrame === 'undefined' || document.hidden) {
      queued = true
      queueMicrotask(() => {
        queued = false
        measure()
      })
      return
    }
    frame = requestAnimationFrame(() => {
      frame = 0
      measure()
    })
  }

  watch(active, () => nextTick(measure), { immediate: true, flush: 'post' })
  // A new indicator element (a menu opened again) starts with no springs on it.
  if (options.indicatorEl)
    watch(options.indicatorEl, () => {
      dropSprings()
      springKey = ''
    })

  if (typeof document !== 'undefined' && document.fonts) {
    document.fonts.ready.then(() => {
      measuredOnce = false
      measure()
    })
  }

  // An ancestor still animating in can make measure() run mid-transition, so re-measure when it ends.
  const awaited = new WeakSet<Animation>()
  function remeasureAfterAncestorTransitions(list: HTMLElement) {
    if (typeof document.getAnimations !== 'function') return
    for (const animation of document.getAnimations()) {
      if (!(animation instanceof CSSTransition) || awaited.has(animation)) continue
      const target = (animation.effect as KeyframeEffect | null)?.target
      if (!target || target === list || !target.contains(list)) continue
      awaited.add(animation)
      animation.finished.then(
        () => {
          measuredOnce = false
          measure()
        },
        // Cancelled before it finished: nothing to settle.
        () => {},
      )
    }
  }

  useResizeObserver(options.listEl, (entries) => {
    for (const entry of entries) borders.delete(entry.target as HTMLElement)
    measure()
  })

  onBeforeUnmount(() => {
    if (frame) cancelAnimationFrame(frame)
    dropSprings()
  })

  return { style, update }
}

function reducedMotion(): boolean {
  return prefersReducedMotion()
}
