import { nextTick, onBeforeUnmount, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'

export interface UseTabIndicatorOptions {
  listEl: Ref<HTMLElement | null>
  /** Must match the `Tabs` instance's own `orientation` — same axis, same keys. */
  orientation?: MaybeRefOrGetter<'horizontal' | 'vertical'>
  /** The active element to measure inside `listEl`. Defaults to Tabs' own shape; SelectButton passes `'[data-checked]'` to reuse the same sliding technique for its single-select indicator. */
  selector?: MaybeRefOrGetter<string>
  /** Default `'transform'`: compositor-only `translate`+`scale` off a 1px CSS baseline — cheapest, but a border-radius on the SCALED axis is computed against that pre-transform 1px box (clamped to ~0.5px per the spec's own corner-radius-vs-edge-length rule) and only THEN stretched, so any indicator needing a real two-axis rounded pill renders a flattened/sharp corner on that axis instead of a proper curve — exactly what happened to SelectButton's pill at the first/last option, where the mismatch against the track's own rounded corner was visible. `'bounds'` sets real `insetInlineStart`/`inlineSize` (or the block equivalents) in px instead — a layout cost on measure, but border-radius then computes against the indicator's true size. */
  sizing?: MaybeRefOrGetter<'transform' | 'bounds'>
}

export interface UseTabIndicatorReturn {
  /** Inline style for a sibling indicator element. Default (`sizing: 'transform'`): `translate` positions it at the active tab's edge, `scale` resizes it to match — both compositor-only, never `inlineSize`/`blockSize`. Pairs with the `.ui-tabs-indicator` CSS, which pins the element to a 1px baseline on the scaled axis. With `sizing: 'bounds'`, sets real `insetInlineStart`/`inlineSize` (or block equivalents) in px instead — see the option's own doc. Bind directly: `:style="style"`. */
  style: Ref<Record<string, string | undefined>>
}

export function useTabIndicator(
  active: Ref<unknown>,
  options: UseTabIndicatorOptions,
): UseTabIndicatorReturn {
  const style = shallowRef<Record<string, string | undefined>>({})
  let measuredOnce = false

  function measure() {
    const list = options.listEl.value
    const selector = toValue(options.selector) ?? '[role="tab"][aria-selected="true"]'
    const tab = list?.querySelector<HTMLElement>(selector)
    if (!list || !tab) return
    const listRect = list.getBoundingClientRect()
    const tabRect = tab.getBoundingClientRect()
    const vertical = toValue(options.orientation) === 'vertical'
    // No transition on first measurement (avoid visible slide-in).
    const transitionDuration = measuredOnce ? undefined : '0ms'
    if (toValue(options.sizing) === 'bounds') {
      style.value = vertical
        ? {
            insetBlockStart: `${tabRect.top - listRect.top}px`,
            blockSize: `${tabRect.height}px`,
            transitionDuration,
          }
        : {
            insetInlineStart: `${tabRect.left - listRect.left}px`,
            inlineSize: `${tabRect.width}px`,
            transitionDuration,
          }
      measuredOnce = true
      return
    }
    // 1px baseline × factor = measured px size.
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
    measuredOnce = true
  }

  watch(active, () => nextTick(measure), { immediate: true, flush: 'post' })

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
