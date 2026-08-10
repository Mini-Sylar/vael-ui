import '../components/shared/scroll-fade.css'
import '../components/shared/tokens.css'
import { watchEffect } from 'vue'
import type { Directive, DirectiveBinding } from 'vue'

export type ScrollMaskAxis = 'x' | 'y' | 'both'
export type ScrollMaskValue = boolean | ScrollMaskAxis | undefined

interface ScrollMaskState {
  observer: ResizeObserver
  axis: ScrollMaskAxis
}

const state = new WeakMap<HTMLElement, ScrollMaskState>()

function resolveAxis(value: ScrollMaskValue): ScrollMaskAxis {
  return value === 'x' || value === 'y' || value === 'both' ? value : 'y'
}

function check(el: HTMLElement, axis: ScrollMaskAxis) {
  if (axis !== 'x') el.classList.toggle('scroll-fade', el.scrollHeight > el.clientHeight)
  if (axis !== 'y') el.classList.toggle('scroll-fade-x', el.scrollWidth > el.clientWidth)
}

function start(el: HTMLElement, axis: ScrollMaskAxis) {
  const existing = state.get(el)
  if (existing) {
    existing.axis = axis
    check(el, axis)
    return
  }
  check(el, axis)
  const observer = new ResizeObserver(() => check(el, state.get(el)?.axis ?? axis))
  observer.observe(el)
  state.set(el, { observer, axis })
}

function stop(el: HTMLElement) {
  state.get(el)?.observer.disconnect()
  state.delete(el)
  el.classList.remove('scroll-fade', 'scroll-fade-x')
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
