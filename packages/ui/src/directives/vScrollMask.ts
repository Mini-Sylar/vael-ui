import '../components/shared/scroll-fade.css'
import '../components/shared/tokens.css'
import '../motion/timing.css'
import { watchEffect } from 'vue'
import type { Directive, DirectiveBinding } from 'vue'

export type ScrollMaskAxis = 'x' | 'y' | 'both'
export type ScrollMaskValue = boolean | ScrollMaskAxis | undefined

interface ScrollMaskState {
  observer: ResizeObserver
  /** Content can outgrow a fixed-size box without resizing it. */
  mutations: MutationObserver
  frame: number
  axis: ScrollMaskAxis
  onScroll?: () => void
}

const state = new WeakMap<HTMLElement, ScrollMaskState>()

const FADE_PROPERTIES = [
  '--fade-top-end',
  '--fade-bottom-start',
  '--fade-left-end',
  '--fade-right-start',
]

function supportsScrollTimeline() {
  // Scroll timelines without percentage ranges would leave the end fade stuck: go manual.
  return (
    typeof CSS !== 'undefined' &&
    CSS.supports('animation-timeline: scroll()') &&
    CSS.supports('animation-range: 0% 100%')
  )
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

// Mirrors scroll-fade.css's keyframes: start fade over the first 40px, end fade over the last 10%.
function applyManualFade(el: HTMLElement, axis: ScrollMaskAxis) {
  const fade = (start: string, end: string, scrolled: number, max: number) => {
    el.style.setProperty(start, `${clamp01(scrolled / 40) * 9}%`)
    el.style.setProperty(end, `${91 + clamp01(((max > 0 ? scrolled / max : 0) - 0.9) / 0.1) * 9}%`)
  }
  if (axis !== 'x')
    fade('--fade-top-end', '--fade-bottom-start', el.scrollTop, el.scrollHeight - el.clientHeight)
  if (axis !== 'y')
    fade(
      '--fade-left-end',
      '--fade-right-start',
      Math.abs(el.scrollLeft),
      el.scrollWidth - el.clientWidth,
    )
}

type Modifiers = Partial<Record<string, boolean>> | undefined
// The value names the axis; failing that, a modifier (`v-scroll-mask.x`); failing that, `y`.
function resolveAxis(value: ScrollMaskValue, modifiers?: Modifiers): ScrollMaskAxis {
  if (value === 'x' || value === 'y' || value === 'both') return value
  return modifiers?.both ? 'both' : modifiers?.x ? 'x' : 'y'
}

// The scrollbar's strip, kept out of the fade (a mask covers the whole box, scrollbar included).
// Only a scrollbar that takes room has one: content runs under an overlay scrollbar, so a strip
// there would leave a column of content unfaded.
function measureBars(el: HTMLElement) {
  const style = getComputedStyle(el)
  const hidden = style.scrollbarWidth === 'none'
  const border = (a: string, b: string) => Number.parseFloat(a) + Number.parseFloat(b)
  const y = el.offsetWidth - el.clientWidth - border(style.borderLeftWidth, style.borderRightWidth)
  const x =
    el.offsetHeight - el.clientHeight - border(style.borderTopWidth, style.borderBottomWidth)
  el.style.setProperty('--ui-scroll-bar-y', `${hidden ? 0 : Math.max(y, 0)}px`)
  el.style.setProperty('--ui-scroll-bar-x', `${hidden ? 0 : Math.max(x, 0)}px`)
}

// Content to scroll to is laid out: a child moved by a transform (a sliding highlight, a tab dragged
// out and settling back) doesn't make the box scroll or fade its edges mid-move, so each child is
// measured by its layout box and its own content, which its transform leaves alone. A positioned,
// aria-hidden decoration isn't content at all. Bare text, or a child with no box: the scroll width decides.
function overflowsX(el: HTMLElement): boolean {
  if (el.scrollWidth <= el.clientWidth) return false
  let start = Infinity
  let end = -Infinity
  for (const child of el.children as HTMLCollectionOf<HTMLElement>) {
    const width = child.offsetWidth
    // An SVG has no layout box to read, a display: contents child neither.
    if (width === undefined || (!width && getComputedStyle(child).display === 'contents'))
      return true
    if (!width || (child.ariaHidden === 'true' && getComputedStyle(child).position === 'absolute'))
      continue
    start = Math.min(start, child.offsetLeft)
    end = Math.max(end, child.offsetLeft + Math.max(width, child.scrollWidth))
  }
  if (start === Infinity) return !el.childElementCount
  const style = getComputedStyle(el)
  const padding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight)
  return end - start + padding > el.clientWidth + 0.5
}

function check(el: HTMLElement, axis: ScrollMaskAxis) {
  if (axis !== 'x') el.classList.toggle('scroll-fade', el.scrollHeight > el.clientHeight)
  if (axis !== 'y') el.classList.toggle('scroll-fade-x', overflowsX(el))
  if (el.classList.contains('scroll-fade') || el.classList.contains('scroll-fade-x'))
    measureBars(el)
  if (state.get(el)?.onScroll) applyManualFade(el, axis)
}

function start(el: HTMLElement, axis: ScrollMaskAxis) {
  const existing = state.get(el)
  if (existing) {
    // Re-rendered with the same axis: the observers already follow its size and content.
    if (existing.axis === axis) return
    existing.axis = axis
    check(el, axis)
    return
  }
  const observer = new ResizeObserver(() => check(el, entry.axis))
  // One check per frame, so a list that re-renders while scrolling adds no extra layout.
  const mutations = new MutationObserver((records) => {
    // New children are watched for size too.
    if (records.some((r) => r.type === 'childList' && r.target === el)) watchChildren()
    // vael-ui's sliding highlight (an aria-hidden, positioned decoration) moving changes nothing
    // that scrolls.
    if (records.every((r) => (r.target as Element).classList?.contains('ui-indicator'))) return
    if (entry.frame) return
    entry.frame = requestAnimationFrame(() => {
      entry.frame = 0
      check(el, entry.axis)
    })
  })
  const entry: ScrollMaskState = { observer, mutations, frame: 0, axis }
  if (!supportsScrollTimeline()) {
    entry.onScroll = () => applyManualFade(el, entry.axis)
    el.classList.add('scroll-fade-manual')
    el.addEventListener('scroll', entry.onScroll, { passive: true })
  }
  state.set(el, entry)
  check(el, axis)
  // Its children too: content that grows inside a box of a fixed size (a tree easing open) never
  // resizes the box itself, and this reports it before the frame paints.
  const watchChildren = () => {
    observer.disconnect()
    observer.observe(el)
    for (const child of el.children) observer.observe(child)
  }
  watchChildren()
  // Size changes come from new nodes, text, or a child's style, class or hidden.
  mutations.observe(el, {
    childList: true,
    subtree: true,
    characterData: true,
    attributeFilter: ['style', 'class', 'hidden'],
  })
}

function stop(el: HTMLElement) {
  const entry = state.get(el)
  if (entry) {
    entry.observer.disconnect()
    entry.mutations.disconnect()
    cancelAnimationFrame(entry.frame)
    if (entry.onScroll) {
      el.removeEventListener('scroll', entry.onScroll)
      for (const property of FADE_PROPERTIES) el.style.removeProperty(property)
    }
  }
  state.delete(el)
  el.classList.remove('scroll-fade', 'scroll-fade-x', 'scroll-fade-manual')
  el.style.removeProperty('--ui-scroll-bar-y')
  el.style.removeProperty('--ui-scroll-bar-x')
}

export const vScrollMask: Directive<HTMLElement, ScrollMaskValue> = {
  mounted(el, binding) {
    if (binding.value === false) return
    start(el, resolveAxis(binding.value, binding.modifiers))
  },
  updated(el, binding) {
    if (binding.value === false) stop(el)
    else start(el, resolveAxis(binding.value, binding.modifiers))
  },
  unmounted(el) {
    stop(el)
  },
}

export function vScrollMaskVapor(el: HTMLElement, binding: DirectiveBinding<ScrollMaskValue>): void
export function vScrollMaskVapor(
  el: HTMLElement,
  value?: () => ScrollMaskValue,
  argument?: string | (() => string),
  modifiers?: Modifiers,
): () => void
export function vScrollMaskVapor(
  el: HTMLElement,
  value?: (() => ScrollMaskValue) | DirectiveBinding<ScrollMaskValue>,
  _argument?: string | (() => string),
  modifiers?: Modifiers,
): (() => void) | void {
  const picked = typeof value === 'function' ? modifiers : value?.modifiers
  watchEffect(() => {
    const current = typeof value === 'function' ? value() : value?.value
    if (current === false) stop(el)
    else start(el, resolveAxis(current, picked))
  })
  return () => stop(el)
}
