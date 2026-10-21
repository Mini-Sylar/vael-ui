import { inject, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useTabIndicator } from './useTabIndicator'
import type { IndicatorMode } from './useTabIndicator'
import type { ElRef } from './dom'
import { defaultsKey } from '../config'

export interface UseHoverIndicatorOptions {
  /** The rows the indicator moves between, matched inside `listEl`. */
  itemSelector: string
  /** A row counts only when its nearest match for this is `listEl` itself, so a nested list (a submenu) keeps its own rows. */
  scope?: string
  orientation?: MaybeRefOrGetter<'horizontal' | 'vertical'>
  /** `listEl` scrolls and the indicator scrolls inside it. */
  scroller?: boolean
  /** Also match each row on the cross axis (rows inset by the list's padding). */
  matchCross?: boolean
  /** A move longer than this many rows jumps instead of gliding. @default 3 */
  maxGlide?: number
  /** `false` hides the indicator and stops tracking. */
  enabled?: MaybeRefOrGetter<boolean>
  /** `false` moves the indicator at once, for an animation of your own. Unset, it follows the nearest ConfigProvider's `motionCss`. */
  motion?: MaybeRefOrGetter<boolean | undefined>
  /** How it moves: `'glide'`, `'instant'` or a spring. Unset, it follows the nearest ConfigProvider's `indicator`. */
  indicator?: MaybeRefOrGetter<IndicatorMode | undefined>
  /** The indicator element. A spring writes to it directly each frame; without it, a spring falls back to the glide. */
  indicatorEl?: ElRef<HTMLElement | null>
}

const MARK = 'data-indicated'
let instances = 0
const DISABLED = ':disabled, [aria-disabled="true"], [data-disabled]'

/**
 * A hover highlight that slides between rows: the row under a mouse or pen, or else the row with
 * keyboard focus. Marks that row `data-indicated` and positions an indicator element on it with
 * `useTabIndicator`. Touch is ignored, as hover styles are. Bind the returned `style` on an element
 * with the `ui-indicator` class inside the list, and give the list `position: relative;
 * isolation: isolate`.
 */
export function useHoverIndicator(
  listEl: ElRef<HTMLElement | null>,
  options: UseHoverIndicatorOptions,
): { style: Ref<Record<string, string | undefined>> } {
  const provided = inject(defaultsKey, undefined)
  // Each instance marks with its own value, so a list nested inside another (a submenu, a table
  // in an expanded row) never measures the outer list's row, or the outer the inner's.
  const id = String(++instances)
  const version = shallowRef(0)
  let current: HTMLElement | null = null
  let pointerInside = false

  function mark(el: HTMLElement | null) {
    if (el === current) return
    current?.removeAttribute(MARK)
    current = el
    el?.setAttribute(MARK, id)
    version.value++
  }

  function rowOf(target: EventTarget | null): HTMLElement | null {
    const list = listEl.value
    if (!list || !(target instanceof Element)) return null
    const row = target.closest<HTMLElement>(options.itemSelector)
    if (!row || !list.contains(row) || row.matches(DISABLED)) return null
    if (options.scope && row.closest(options.scope) !== list) return null
    return row
  }

  function focusedRow(): HTMLElement | null {
    const active = document.activeElement
    if (!active?.matches(':focus-visible')) return null
    return rowOf(active)
  }

  function onPointerOver(event: PointerEvent) {
    if (event.pointerType === 'touch' || toValue(options.enabled) === false) return
    pointerInside = true
    const row = rowOf(event.target)
    // A gap between rows, or a wrapper around them, keeps the last row; a separator or label clears it.
    const between =
      !row && event.target instanceof Element && !!event.target.querySelector(options.itemSelector)
    if (!between) mark(row)
  }
  function onPointerLeave(event: PointerEvent) {
    if (event.pointerType === 'touch') return
    pointerInside = false
    mark(focusedRow())
  }
  // Keyboard focus always wins, even with the pointer resting in the list: arrow keys move the
  // highlight with them. Pointer focus isn't :focus-visible, so a click leaves the hover alone.
  function onFocusIn() {
    if (toValue(options.enabled) === false) return
    const row = focusedRow()
    if (row || !pointerInside) mark(row)
  }
  function onFocusOut(event: FocusEvent) {
    if (!pointerInside && !listEl.value?.contains(event.relatedTarget as Node | null)) mark(null)
  }

  watch(
    listEl,
    (el, _prev, onCleanup) => {
      mark(null)
      if (!el) return
      el.addEventListener('pointerover', onPointerOver)
      el.addEventListener('pointerleave', onPointerLeave)
      el.addEventListener('focusin', onFocusIn)
      el.addEventListener('focusout', onFocusOut)
      onCleanup(() => {
        el.removeEventListener('pointerover', onPointerOver)
        el.removeEventListener('pointerleave', onPointerLeave)
        el.removeEventListener('focusin', onFocusIn)
        el.removeEventListener('focusout', onFocusOut)
      })
    },
    { immediate: true },
  )
  watch(
    () => toValue(options.enabled),
    (enabled) => enabled === false && mark(null),
  )

  return useTabIndicator(version, {
    listEl,
    orientation: options.orientation ?? 'vertical',
    selector: `[${MARK}="${id}"]`,
    scroller: options.scroller,
    matchCross: options.matchCross ?? true,
    maxGlide: options.maxGlide ?? 3,
    motion: () => toValue(options.motion) ?? provided?.value.motionCss,
    indicator: options.indicator,
    indicatorEl: options.indicatorEl,
  })
}
