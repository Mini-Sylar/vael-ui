import { watchEffect } from 'vue'
import type { Directive } from 'vue'

interface ScrollMaskState {
  observer: ResizeObserver
}

const state = new WeakMap<HTMLElement, ScrollMaskState>()

function check(el: HTMLElement) {
  el.classList.toggle('scroll-fade', el.scrollHeight > el.clientHeight)
}

function start(el: HTMLElement) {
  if (state.has(el)) return
  check(el)
  const observer = new ResizeObserver(() => check(el))
  observer.observe(el)
  state.set(el, { observer })
}

function stop(el: HTMLElement) {
  state.get(el)?.observer.disconnect()
  state.delete(el)
  el.classList.remove('scroll-fade')
}

/**
 * Masks an element's top/bottom edge as its content scrolls, signaling
 * there's more — originally built into Dialog's `scrollFade` prop, extracted
 * so any scrollable element can opt in directly: `<div v-scroll-mask>`.
 * Bind a boolean to toggle it (`v-scroll-mask="false"` disables) — on by
 * default.
 *
 * The fade itself is pure CSS (`.scroll-fade` in style.css, driven by
 * `animation-timeline: scroll(self)`) — this directive's only job is
 * toggling that class based on whether the element actually overflows,
 * since the CSS alone can't distinguish "not scrollable" from "at rest,
 * more below" (both read as 0% scroll progress).
 */
export const vScrollMask: Directive<HTMLElement, boolean | undefined> = {
  mounted(el, binding) {
    if (binding.value === false) return
    start(el)
  },
  updated(el, binding) {
    if (binding.value === false) stop(el)
    else start(el)
  },
  unmounted(el) {
    stop(el)
  },
}

/**
 * Vapor-compiled equivalent of `vScrollMask` — see vTooltipVapor's own
 * comment for why the object-shaped directive above crashes Vapor's
 * `withVaporDirectives` ("dir is not a function") and why `value` arrives
 * as a getter needing an explicit watchEffect instead of a separate
 * `updated` hook. `start`/`stop` are already idempotent (guarded by the
 * `state` WeakMap), so the effect body is a direct port of `updated` above.
 */
export function vScrollMaskVapor(el: HTMLElement, value: () => boolean | undefined): () => void {
  watchEffect(() => {
    if (value() === false) stop(el)
    else start(el)
  })
  return () => stop(el)
}
