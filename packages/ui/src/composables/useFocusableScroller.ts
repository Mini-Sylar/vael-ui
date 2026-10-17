import { toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useMutationObserver, useResizeObserver } from '@vueuse/core'
import type { ElRef } from './dom'

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable=""], [contenteditable="true"]'

// Like Chrome's focusable scrollers: a tab stop only while it overflows with nothing tabbable inside.
export function useFocusableScroller(
  el: ElRef<HTMLElement | null | undefined>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  let owned: HTMLElement | null = null

  function release() {
    if (owned?.getAttribute('tabindex') === '0') owned.removeAttribute('tabindex')
    owned = null
  }

  function update() {
    const node = el.value
    if (!node || !toValue(enabled)) {
      release()
      return
    }
    if (owned && owned !== node) release()
    // A consumer's own tabindex wins.
    if (owned !== node && node.hasAttribute('tabindex')) return
    const style = getComputedStyle(node)
    const scrolls = (overflow: string) => overflow === 'auto' || overflow === 'scroll'
    const overflows =
      (scrolls(style.overflowY) && node.scrollHeight > node.clientHeight + 1) ||
      (scrolls(style.overflowX) && node.scrollWidth > node.clientWidth + 1)
    const hasTabbable = node.querySelector(TABBABLE) !== null
    if (overflows && !hasTabbable) {
      if (node.getAttribute('tabindex') !== '0') node.setAttribute('tabindex', '0')
      owned = node
    } else if (owned === node) {
      release()
    }
  }

  useResizeObserver(el, update)
  useMutationObserver(el, update, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['tabindex', 'disabled', 'href', 'hidden'],
  })
  watch([el, () => toValue(enabled)], update, { flush: 'post' })

  return { update }
}
