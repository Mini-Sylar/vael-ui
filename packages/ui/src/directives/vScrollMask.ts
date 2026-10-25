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
  return typeof CSS !== 'undefined' && CSS.supports('animation-timeline: scroll()')
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

// Mirrors scroll-fade.css's keyframes: start fade over the first 40px, end fade over the last 10%.
function applyManualFade(el: HTMLElement, axis: ScrollMaskAxis) {
  if (axis !== 'x') {
    const max = el.scrollHeight - el.clientHeight
    const progress = max > 0 ? el.scrollTop / max : 0
    el.style.setProperty('--fade-top-end', `${clamp01(el.scrollTop / 40) * 9}%`)
    el.style.setProperty('--fade-bottom-start', `${91 + clamp01((progress - 0.9) / 0.1) * 9}%`)
  }
  if (axis !== 'y') {
    const max = el.scrollWidth - el.clientWidth
    const scrolled = Math.abs(el.scrollLeft)
    const progress = max > 0 ? scrolled / max : 0
    el.style.setProperty('--fade-left-end', `${clamp01(scrolled / 40) * 9}%`)
    el.style.setProperty('--fade-right-start', `${91 + clamp01((progress - 0.9) / 0.1) * 9}%`)
  }
}

function resolveAxis(value: ScrollMaskValue): ScrollMaskAxis {
  return value === 'x' || value === 'y' || value === 'both' ? value : 'y'
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

function check(el: HTMLElement, axis: ScrollMaskAxis) {
  if (axis !== 'x') el.classList.toggle('scroll-fade', el.scrollHeight > el.clientHeight)
  if (axis !== 'y') el.classList.toggle('scroll-fade-x', el.scrollWidth > el.clientWidth)
  if (el.classList.contains('scroll-fade') || el.classList.contains('scroll-fade-x'))
    measureBars(el)
  if (state.get(el)?.onScroll) applyManualFade(el, axis)
}

function start(el: HTMLElement, axis: ScrollMaskAxis) {
  const existing = state.get(el)
  if (existing) {
    existing.axis = axis
    check(el, axis)
    return
  }
  const observer = new ResizeObserver(() => check(el, state.get(el)?.axis ?? axis))
  // One check per frame, so a list that re-renders while scrolling adds no extra layout.
  const mutations = new MutationObserver(() => {
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
  observer.observe(el)
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
  entry?.observer.disconnect()
  entry?.mutations.disconnect()
  if (entry?.frame) cancelAnimationFrame(entry.frame)
  if (entry?.onScroll) {
    el.removeEventListener('scroll', entry.onScroll)
    for (const property of FADE_PROPERTIES) el.style.removeProperty(property)
  }
  state.delete(el)
  el.classList.remove('scroll-fade', 'scroll-fade-x', 'scroll-fade-manual')
  el.style.removeProperty('--ui-scroll-bar-y')
  el.style.removeProperty('--ui-scroll-bar-x')
}

export const vScrollMask: Directive<HTMLElement, ScrollMaskValue> = {
  mounted(el, binding) {
    if (binding.value === false) return
    start(el, resolveAxis(binding.value))
  },
  updated(el, binding) {
    if (binding.value === false) stop(el)
    else start(el, resolveAxis(binding.value))
  },
  unmounted(el) {
    stop(el)
  },
}

export function vScrollMaskVapor(el: HTMLElement, binding: DirectiveBinding<ScrollMaskValue>): void
export function vScrollMaskVapor(el: HTMLElement, value?: () => ScrollMaskValue): () => void
export function vScrollMaskVapor(
  el: HTMLElement,
  value?: (() => ScrollMaskValue) | DirectiveBinding<ScrollMaskValue>,
): (() => void) | void {
  watchEffect(() => {
    const current = typeof value === 'function' ? value() : undefined
    if (current === false) stop(el)
    else start(el, resolveAxis(current))
  })
  return () => stop(el)
}
