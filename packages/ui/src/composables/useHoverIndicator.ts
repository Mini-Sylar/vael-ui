import { inject, onScopeDispose, toValue, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { MaybeRefOrGetter } from 'vue'
import { useTabIndicator } from './useTabIndicator'
import type { IndicatorMode, UseTabIndicatorReturn } from './useTabIndicator'
import type { ElRef } from './dom'
import { loadHoverHandoff } from './lazyParts'
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
  /** `false` moves the indicator at once, for an animation of your own. Unset, it follows the nearest ConfigProvider's `motion`. */
  motion?: MaybeRefOrGetter<boolean | undefined>
  /** How it moves: `'glide'`, `'instant'` or a spring. Unset, it follows the nearest ConfigProvider's `indicator`. */
  indicator?: MaybeRefOrGetter<IndicatorMode | undefined>
  /** The indicator element. A spring writes to it directly each frame; without it, a spring falls back to the glide. */
  indicatorEl?: ElRef<HTMLElement | null>
  /** Lists sharing a group hand the highlight over: moving straight from one into a neighbour, it glides across instead of fading out and in. MenuList and Tree use `'menu-list'` and `'tree'`. */
  group?: string
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
): UseTabIndicatorReturn {
  const provided = inject(defaultsKey, undefined)
  // Each instance marks with its own value, so a list nested inside another (a submenu, a table
  // in an expanded row) never measures the outer list's row, or the outer the inner's.
  const id = String(++instances)
  let current: HTMLElement | null = null
  let pointerInside = false
  // Keyboard jumps (typeahead, Home, End) land at once; the pointer always glides, however fast,
  // so a quick sweep chases the cursor instead of teleporting between the rows it skipped.
  let fromKeyboard = false

  const indicator = useTabIndicator(() => listEl.value, {
    listEl,
    orientation: options.orientation ?? 'vertical',
    selector: `[${MARK}="${id}"]`,
    scroller: options.scroller,
    matchCross: options.matchCross ?? true,
    maxGlide: () => (fromKeyboard ? (options.maxGlide ?? 3) : Number.POSITIVE_INFINITY),
    motion: () => toValue(options.motion) ?? provided?.value.motion,
    indicator: options.indicator,
    indicatorEl: options.indicatorEl,
    position: 'translate',
  })
  function mark(el: HTMLElement | null, keyboard = false) {
    if (el === current) return
    current?.removeAttribute(MARK)
    current = el
    el?.setAttribute(MARK, id)
    fromKeyboard = keyboard
    indicator.update()
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

  function indicatorOf(): HTMLElement | null {
    return (
      options.indicatorEl?.value ?? listEl.value?.querySelector(':scope > .ui-indicator') ?? null
    )
  }
  // Lists in a group hand the highlight over; that code loads only for them, and only in a browser
  // (a server render would start an import that outlives it).
  let handoff: typeof import('./hoverHandoff') | undefined
  if (options.group && typeof window !== 'undefined')
    void loadHoverHandoff().then((kit) => (handoff = kit))

  function onPointerOver(event: PointerEvent) {
    if (event.pointerType === 'touch' || toValue(options.enabled) === false) return
    pointerInside = true
    const row = rowOf(event.target)
    if (row) {
      const arriving = !current
      mark(row)
      if (arriving && listEl.value)
        handoff?.receive(options, provided?.value, listEl.value, row, indicatorOf)
      return
    }
    // Between rows (a gap, a group label, a separator) it keeps the last one and glides on from
    // there; a row it can't take (disabled, or a nested list's) clears it.
    if (event.target instanceof Element && event.target.closest(options.itemSelector)) mark(null)
  }
  function onPointerLeave(event: PointerEvent) {
    if (event.pointerType === 'touch') return
    pointerInside = false
    const shown = current && indicatorOf()
    if (shown && listEl.value) handoff?.release(options.group!, listEl.value, shown)
    mark(focusedRow())
  }
  // Keyboard focus always wins, even with the pointer resting in the list: arrow keys move the
  // highlight with them. Pointer focus isn't :focus-visible, so a click leaves the hover alone.
  function onFocusIn() {
    if (toValue(options.enabled) === false) return
    const row = focusedRow()
    if (row || !pointerInside) mark(row, true)
  }
  function onFocusOut(event: FocusEvent) {
    if (!pointerInside && !listEl.value?.contains(event.relatedTarget as Node | null)) mark(null)
  }

  // VueUse re-binds when the list element changes and unbinds with the scope.
  useEventListener(listEl, 'pointerover', onPointerOver)
  useEventListener(listEl, 'pointerleave', onPointerLeave)
  useEventListener(listEl, 'focusin', onFocusIn)
  useEventListener(listEl, 'focusout', onFocusOut)
  // A removed list lets go of its last row.
  watch(listEl, () => {
    current = null
  })
  onScopeDispose(() => {
    current = null
  })
  watch(
    () => toValue(options.enabled),
    (enabled) => enabled === false && mark(null),
  )

  return indicator
}
