import '../components/shared/indicator.css'
import '../components/shared/tokens.css'
import '../motion/timing.css'
import { effectScope, nextTick, shallowRef, watch } from 'vue'
import type {
  ComponentInternalInstance,
  ComputedRef,
  Directive,
  DirectiveBinding,
  ShallowRef,
} from 'vue'
import { useHoverIndicator } from '../composables/useHoverIndicator'
import { defaultsKey, injectDefaults, runOutside } from '../config'
import type { UiDefaults } from '../config'

export interface HoverIndicatorOptions {
  /** CSS selector for the rows the highlight moves between. */
  itemSelector: string
  /** Draws the highlight over the rows as a see-through tint, for rows with a solid background. */
  over?: boolean
  /** A row counts only when its nearest match for this is the list itself, so a nested list keeps its own rows. */
  scope?: string
  /** `'horizontal'` for a row of items side by side. @default 'vertical' */
  orientation?: 'horizontal' | 'vertical'
  /** The list scrolls and the highlight scrolls inside it. Unset, it checks whether the list scrolls. */
  scroller?: boolean
  /** Lists sharing a group hand the highlight over as the pointer moves from one to the next. */
  group?: string
  /** A class of your own on the highlight element, to style it. */
  class?: string
  /** `false` hides the highlight and stops following the pointer, such as while a row is dragged. */
  enabled?: boolean
}

/** A row selector, or options. `false` or nothing turns it off. */
export type HoverIndicatorValue = string | HoverIndicatorOptions | false | null | undefined

interface Running {
  stop: () => void
  key: string
  enabled: ShallowRef<boolean>
}
const running = new WeakMap<HTMLElement, Running>()

const optionsOf = (
  value: HoverIndicatorValue,
  modifiers: Partial<Record<string, boolean>>,
): HoverIndicatorOptions | undefined => {
  if (!value) return undefined
  const options = typeof value === 'string' ? { itemSelector: value } : value
  return { ...options, over: options.over ?? !!modifiers.over }
}

// The list gets its own indicator element (a list item in a list), and the highlight follows the
// pointer between its rows.
function start(el: HTMLElement, options: HoverIndicatorOptions, enabled: ShallowRef<boolean>) {
  const horizontal = options.orientation === 'horizontal'
  const indicator = document.createElement(/^(UL|OL)$/.test(el.tagName) ? 'li' : 'div')
  indicator.className = [
    'ui-indicator',
    horizontal && 'ui-indicator--inline',
    options.over && 'ui-indicator--over',
    options.class,
  ]
    .filter(Boolean)
    .join(' ')
  indicator.setAttribute('aria-hidden', 'true')
  el.prepend(indicator)
  el.classList.add('ui-hover-list')
  const overflow = getComputedStyle(el)[horizontal ? 'overflowX' : 'overflowY']
  const scope = effectScope(true)
  scope.run(() => {
    const { style } = useHoverIndicator(shallowRef(el), {
      itemSelector: options.itemSelector,
      indicatorEl: shallowRef(indicator),
      scope: options.scope,
      orientation: options.orientation,
      // A list that scrolls itself carries the highlight in its scrolled coordinates.
      scroller: options.scroller ?? (overflow === 'auto' || overflow === 'scroll'),
      group: options.group,
      enabled,
    })
    // Written to the element as it changes; a property it drops is cleared.
    watch(
      style,
      (next, before = {}) => {
        for (const name of Object.keys(before)) if (!(name in next)) setStyle(indicator, name, '')
        for (const [name, value] of Object.entries(next)) setStyle(indicator, name, value ?? '')
      },
      { immediate: true },
    )
  })
  return () => {
    scope.stop()
    indicator.remove()
    el.classList.remove('ui-hover-list')
  }
}

function setStyle(el: HTMLElement, name: string, value: string) {
  if (name.startsWith('--')) el.style.setProperty(name, value)
  else (el.style as unknown as Record<string, string>)[name] = value
}

function apply(
  el: HTMLElement,
  value: HoverIndicatorValue,
  modifiers: Partial<Record<string, boolean>>,
  setup: (run: () => () => void) => () => void,
) {
  const options = optionsOf(value, modifiers)
  // `enabled` changes in place (a drag pausing it); anything else sets it up again.
  const { enabled: _, ...rest } = options ?? { itemSelector: '' }
  const key = options ? JSON.stringify(rest) : ''
  const now = running.get(el)
  if (now && now.key === key) {
    now.enabled.value = options?.enabled !== false
    return
  }
  now?.stop()
  running.delete(el)
  if (!options) return
  const enabled = shallowRef(options.enabled !== false)
  running.set(el, { key, enabled, stop: setup(() => start(el, options, enabled)) })
}

function stop(el: HTMLElement) {
  running.get(el)?.stop()
  running.delete(el)
}

type Provides = Record<symbol, unknown>
// Its component's provider: the directive sets up after that component's setup has finished.
function defaultsOf(binding: DirectiveBinding, vnode: unknown) {
  const owner =
    (vnode as { ctx?: ComponentInternalInstance | null }).ctx ?? binding.instance?.$ ?? null
  const provides = (owner as { provides?: Provides } | null)?.provides
  return provides?.[defaultsKey as symbol] as ComputedRef<UiDefaults> | undefined
}

/**
 * A hover highlight that slides between a list's rows, as in vael-ui's own lists:
 * `v-hover-indicator=".row"`. `.over` draws it as a tint over rows with a solid background.
 */
export const vHoverIndicator: Directive<HTMLElement, HoverIndicatorValue> = {
  mounted(el, binding, vnode) {
    const defaults = defaultsOf(binding, vnode)
    apply(el, binding.value, binding.modifiers, (run) => runOutside(defaults, run))
  },
  updated(el, binding, vnode) {
    const defaults = defaultsOf(binding, vnode)
    apply(el, binding.value, binding.modifiers, (run) => runOutside(defaults, run))
  },
  unmounted(el) {
    stop(el)
  },
}

export function vHoverIndicatorVapor(
  el: HTMLElement,
  binding: DirectiveBinding<HoverIndicatorValue>,
): void
export function vHoverIndicatorVapor(
  el: HTMLElement,
  value?: () => HoverIndicatorValue,
  argument?: unknown,
  modifiers?: Partial<Record<string, boolean>>,
): () => void
export function vHoverIndicatorVapor(
  el: HTMLElement,
  value?: (() => HoverIndicatorValue) | DirectiveBinding<HoverIndicatorValue>,
  _argument?: unknown,
  modifiers: Partial<Record<string, boolean>> = {},
): (() => void) | void {
  // Called in its component's setup, where `inject` finds the provider. The element joins the
  // page after setup, so each start waits a tick before it measures.
  const defaults = injectDefaults()
  const scope = effectScope()
  scope.run(() =>
    watch(
      () => (typeof value === 'function' ? value() : undefined),
      (now) =>
        nextTick(() => {
          if (scope.active) apply(el, now, modifiers, (run) => runOutside(defaults, run))
        }),
      { immediate: true },
    ),
  )
  return () => {
    scope.stop()
    stop(el)
  }
}
