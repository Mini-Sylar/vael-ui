import '../components/shared/scroll-fade.css'
import '../components/shared/tokens.css'
import { watchEffect } from 'vue'
import type { Directive, DirectiveBinding } from 'vue'

export type ScrollMaskAxis = 'x' | 'y' | 'both'
export type ScrollMaskValue = boolean | ScrollMaskAxis | undefined

interface ScrollMaskState {
  observer: ResizeObserver
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

function check(el: HTMLElement, axis: ScrollMaskAxis) {
  if (axis !== 'x') el.classList.toggle('scroll-fade', el.scrollHeight > el.clientHeight)
  if (axis !== 'y') el.classList.toggle('scroll-fade-x', el.scrollWidth > el.clientWidth)
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
  const entry: ScrollMaskState = { observer, axis }
  if (!supportsScrollTimeline()) {
    entry.onScroll = () => applyManualFade(el, entry.axis)
    el.classList.add('scroll-fade-manual')
    el.addEventListener('scroll', entry.onScroll, { passive: true })
  }
  state.set(el, entry)
  check(el, axis)
  observer.observe(el)
}

function stop(el: HTMLElement) {
  const entry = state.get(el)
  entry?.observer.disconnect()
  if (entry?.onScroll) {
    el.removeEventListener('scroll', entry.onScroll)
    for (const property of FADE_PROPERTIES) el.style.removeProperty(property)
  }
  state.delete(el)
  el.classList.remove('scroll-fade', 'scroll-fade-x', 'scroll-fade-manual')
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
