import { watchEffect } from 'vue'
import type { Directive, DirectiveBinding } from 'vue'

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

// v-scroll-mask on any scrollable element, on by default. Bind false to
// disable: v-scroll-mask="false".
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

export function vScrollMaskVapor(
  el: HTMLElement,
  binding: DirectiveBinding<boolean | undefined>,
): void
export function vScrollMaskVapor(el: HTMLElement, value?: () => boolean | undefined): () => void
export function vScrollMaskVapor(
  el: HTMLElement,
  value?: (() => boolean | undefined) | DirectiveBinding<boolean | undefined>,
): (() => void) | void {
  watchEffect(() => {
    const current = typeof value === 'function' ? value() : undefined
    if (current === false) stop(el)
    else start(el)
  })
  return () => stop(el)
}
