import { nextTick, onBeforeUnmount, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'

export interface UseTabIndicatorOptions {
  listEl: Ref<HTMLElement | null>
  /** Must match the `Tabs` instance's own `orientation` — same axis, same keys. */
  orientation?: MaybeRefOrGetter<'horizontal' | 'vertical'>
  /** The active element to measure inside `listEl`. Defaults to Tabs' own shape; SelectButton passes `'[data-checked]'` to reuse the same sliding technique for its single-select indicator. */
  selector?: MaybeRefOrGetter<string>
  /** Default `'bounds'`: sets real `insetInlineStart`/`inlineSize` (or the block equivalents) in px — a small layout cost on measure, but border-radius computes against the indicator's true size and it renders identically regardless of the display's pixel ratio. `'transform'` instead does compositor-only `translate`+`scale` off a 1px CSS baseline — cheaper, but a border-radius on the SCALED axis is computed against that pre-transform 1px box (clamped to ~0.5px per the spec's own corner-radius-vs-edge-length rule) and only THEN stretched, so any indicator needing a real two-axis rounded pill renders a flattened/sharp corner on that axis instead of a proper curve, and on a fractional device-pixel-ratio display (common on Windows) the scale can round unevenly enough to look visibly misaligned. Only reach for `'transform'` when the indicator has no rounded corners on the scaled axis and the extra compositor-only cheapness genuinely matters. */
  sizing?: MaybeRefOrGetter<'transform' | 'bounds'>
}

export interface UseTabIndicatorReturn {
  /** Inline style for a sibling indicator element. Default (`sizing: 'bounds'`): sets real `insetInlineStart`/`inlineSize` (or block equivalents) in px. With `sizing: 'transform'`, `translate` positions it at the active tab's edge and `scale` resizes it to match instead — both compositor-only, never `inlineSize`/`blockSize`; pairs with the `.ui-tabs-indicator` CSS, which pins the element to a 1px baseline on the scaled axis — see the option's own doc. Bind directly: `:style="style"`. */
  style: Ref<Record<string, string | undefined>>
}

export function useTabIndicator(
  active: Ref<unknown>,
  options: UseTabIndicatorOptions,
): UseTabIndicatorReturn {
  const style = shallowRef<Record<string, string | undefined>>({})
  let measuredOnce = false
  // Tracks whether a real match has ever been positioned, separately from
  // measuredOnce — lets the first real selection (from "nothing selected")
  // skip only the position/size transition, not the opacity fade.
  let hasAppeared = false

  function measure() {
    const list = options.listEl.value
    const selector = toValue(options.selector) ?? '[role="tab"][aria-selected="true"]'
    const tab = list?.querySelector<HTMLElement>(selector)
    if (!list) return
    if (!tab) {
      style.value = { ...style.value, opacity: '0' }
      measuredOnce = true
      return
    }
    const listRect = list.getBoundingClientRect()
    const tabRect = tab.getBoundingClientRect()
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
      style.value = vertical
        ? {
            translate: `0 ${tabRect.top - listRect.top}px`,
            scale: `1 ${tabRect.height}`,
            transitionDuration,
          }
        : {
            translate: `${tabRect.left - listRect.left}px 0`,
            scale: `${tabRect.width} 1`,
            transitionDuration,
          }
      return
    }
    // getBoundingClientRect measures the border box, but an absolutely
    // positioned child's inset-* resolves against the containing block's
    // PADDING box — a container with its own border (SelectButton's track)
    // needs that border subtracted or the indicator lands one border-width
    // further along than the option it's supposed to match exactly.
    const listStyle = getComputedStyle(list)
    const borderInlineStart = parseFloat(listStyle.borderInlineStartWidth) || 0
    const borderBlockStart = parseFloat(listStyle.borderBlockStartWidth) || 0
    // Order matches this branch's transition-property list; a partial
    // override still needs a value per slot, so opacity's restates the CSS.
    const transitionDuration = firstPaint
      ? '0ms'
      : firstAppearance
        ? `0ms, 0ms, var(--ui-duration-press)`
        : undefined
    style.value = vertical
      ? {
          insetBlockStart: `${tabRect.top - listRect.top - borderBlockStart}px`,
          blockSize: `${tabRect.height}px`,
          transitionDuration,
        }
      : {
          insetInlineStart: `${tabRect.left - listRect.left - borderInlineStart}px`,
          inlineSize: `${tabRect.width}px`,
          transitionDuration,
        }
  }

  watch(active, () => nextTick(measure), { immediate: true, flush: 'post' })

  if (typeof document !== 'undefined' && document.fonts) {
    document.fonts.ready.then(() => {
      measuredOnce = false
      measure()
    })
  }

  let resizeObserver: ResizeObserver | undefined
  watch(
    options.listEl,
    (el, _prev, onCleanup) => {
      resizeObserver?.disconnect()
      if (!el) return
      resizeObserver = new ResizeObserver(() => measure())
      resizeObserver.observe(el)
      onCleanup(() => resizeObserver?.disconnect())
    },
    { immediate: true },
  )

  onBeforeUnmount(() => resizeObserver?.disconnect())

  return { style }
}
