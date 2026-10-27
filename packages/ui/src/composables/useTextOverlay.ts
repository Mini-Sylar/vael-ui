import { shallowRef, watch } from 'vue'
import { useEventListener, useResizeObserver } from '@vueuse/core'
import type { Ref } from 'vue'
import type { ElRef } from './dom'

export interface UseTextOverlayReturn {
  /** Absolute position, size and font matching the input's text box, relative to `frameEl`. */
  style: Ref<Record<string, string>>
  /** The field's scroll, so overlaid text can follow it. */
  scroll: Ref<{ x: number; y: number }>
}

/**
 * @internal Places an element exactly over an input's text, in its font, while `active()`.
 * Rects stay fractional: offsetLeft and friends round, which nudges the text half a pixel.
 */
export function useTextOverlay(
  inputEl: ElRef<HTMLInputElement | HTMLTextAreaElement | null>,
  frameEl: ElRef<HTMLElement | null>,
  active: () => boolean,
  options: { multiline?: boolean } = {},
): UseTextOverlayReturn {
  const style = shallowRef<Record<string, string>>({})
  const scroll = shallowRef({ x: 0, y: 0 })

  function measure() {
    const input = inputEl.value
    const frame = frameEl.value
    if (!input || !frame) return
    const css = getComputedStyle(input)
    const frameCss = getComputedStyle(frame)
    const px = (from: CSSStyleDeclaration, name: string) => parseFloat(from.getPropertyValue(name))
    const box = input.getBoundingClientRect()
    const outer = frame.getBoundingClientRect()
    const startX = px(css, 'border-left-width') + px(css, 'padding-left')
    const endX = px(css, 'border-right-width') + px(css, 'padding-right')
    const startY = px(css, 'border-top-width') + px(css, 'padding-top')
    const endY = px(css, 'border-bottom-width') + px(css, 'padding-bottom')
    const height = box.height - startY - endY
    const left = box.left - outer.left - px(frameCss, 'border-left-width') + startX
    const top = box.top - outer.top - px(frameCss, 'border-top-width') + startY
    // Longhands: `font` reads back empty once `font-variant-numeric` is set (InputNumber).
    const shared = {
      left: `${left}px`,
      top: `${top}px`,
      fontFamily: css.fontFamily,
      fontSize: css.fontSize,
      fontWeight: css.fontWeight,
      fontStyle: css.fontStyle,
      fontStretch: css.fontStretch,
      fontVariantNumeric: css.fontVariantNumeric,
      fontFeatureSettings: css.fontFeatureSettings,
      letterSpacing: css.letterSpacing,
      textAlign: css.textAlign,
      direction: css.direction,
    }
    // A textarea wraps inside its client width, which leaves out the scrollbar.
    style.value = options.multiline
      ? {
          ...shared,
          // Less the caret's 1px, which a textarea keeps free at the end of each line.
          width: `${input.clientWidth - px(css, 'padding-left') - px(css, 'padding-right') - 1}px`,
          height: `${input.clientHeight - px(css, 'padding-top') - px(css, 'padding-bottom')}px`,
          lineHeight: css.lineHeight,
          whiteSpace: 'pre-wrap',
          overflowWrap: css.overflowWrap,
          wordBreak: css.wordBreak,
          tabSize: css.tabSize,
        }
      : // One line as tall as the text box centres the text the way the input centres its own.
        {
          ...shared,
          width: `${box.width - startX - endX}px`,
          height: `${height}px`,
          lineHeight: `${height}px`,
        }
    syncScroll()
  }
  function syncScroll() {
    const input = inputEl.value
    if (input) scroll.value = { x: input.scrollLeft, y: input.scrollTop }
  }

  watch(active, (on) => on && measure(), { immediate: true })
  const field = () => (active() ? inputEl.value : null)
  useResizeObserver(field, measure)
  // The caret scrolls a long value; these cover typing, arrow keys and selection.
  const sync = () => {
    syncScroll()
    requestAnimationFrame(syncScroll)
  }
  useEventListener(field, ['scroll', 'input', 'keyup', 'select', 'pointerup'], sync)

  return { style, scroll }
}
