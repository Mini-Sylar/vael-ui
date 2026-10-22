// Your own components, in the app's motion style: bind `transition` to Vue's <Transition>, mark parts and targets.
import { computed, onMounted, onScopeDispose, shallowReactive } from 'vue'
import type { TransitionProps } from 'vue'
import { PRESENCE_ATTR, refElement } from './presence'
import type { MotionRole, MotionStyle, MotionValues, OwnMotion, UseMotionReturn } from './types'
import { useMotionStyle } from './context'
import { PRESENCE_ID } from './ids'
import type { ListMotion } from './list'
import { useComponentMotion } from './useComponentMotion'

/**
 * Makes a component of yours move like vael-ui's: it follows the nearest ConfigProvider's style for `role`,
 * your targets inside it join it, and it waits for them.
 *
 * ```vue
 * <Transition v-bind="motion.transition"><div v-if="open">…</div></Transition>
 * ```
 *
 * No `part()` needed for one element: what the Transition moves is the root. Name your targets
 * (`useMotion<'title' | 'lines'>()`) and expose `target` on a slot: they autocomplete there.
 */
export function useMotion<N extends string = string>(
  role: 'list',
  motion?: () => OwnMotion<'list', N> | undefined,
): UseMotionReturn<N>
export function useMotion<N extends string = string>(
  role: 'reveal' | 'content',
  motion?: () => OwnMotion<'reveal', N> | undefined,
): UseMotionReturn<N>
export function useMotion<N extends string = string>(
  role?: 'overlay',
  motion?: () => OwnMotion<'overlay', N> | undefined,
): UseMotionReturn<N>
export function useMotion<N extends string = string>(
  role: MotionRole = 'overlay',
  motion?: () => unknown,
): UseMotionReturn<N> {
  if (role === 'list') return useListMotion<N>(motion)
  const parts = shallowReactive<Record<string, Element | null>>({})
  // The element <Transition> is moving: with no parts marked, it's the root.
  let moving: Element | null = null
  const marked = () => Object.values(parts).some(Boolean)
  const inner = useComponentMotion({
    name: 'useMotion',
    role: role as keyof MotionStyle,
    key: role as keyof MotionStyle,
    mainPart: 'root',
    parts: () => (marked() ? parts : { root: moving }),
    root: () => parts.root ?? Object.values(parts).find(Boolean) ?? moving,
    // Always driven by the runtime: your markup has no built-in CSS motion to fall back on.
    motion: () => motion?.() ?? {},
    defaults: (): Record<string, MotionValues> =>
      role === 'overlay' || role === 'reveal' ? { root: { opacity: 0, scale: '0.97' } } : {},
  })
  const transition = computed<TransitionProps>(() => ({
    ...(inner.transition.value as TransitionProps),
    onBeforeEnter: (el: Element) => {
      moving = el
      // Your targets and v-animate inside it join it, as they would a marked root.
      if (!marked()) el.setAttribute(PRESENCE_ATTR, '')
    },
    onBeforeLeave: (el: Element) => {
      moving = el
    },
  }))
  return {
    get transition() {
      return transition.value
    },
    part: (name: string) => (raw: unknown) => {
      const el = refElement(raw)
      // The root part is where your targets join; mark it so v-animate finds it too.
      if (el && name === 'root') el.setAttribute(PRESENCE_ATTR, '')
      if (el) parts[name] = el
    },
    target: inner.target,
    get phase() {
      return inner.phase.value
    },
  }
}

const LIST_DEFAULT: MotionValues = { opacity: 0, y: 6 }
let lists = 0

/**
 * `useMotion('list')` on a `<TransitionGroup>`: items stagger in, leave lifted out where they were,
 * the rest slide into place, and the list's box follows its height. Keys: `initial.item`,
 * `exit.item`, `stagger`, `leaving`.
 */
function useListMotion<N extends string>(motion?: () => unknown): UseMotionReturn<N> {
  const style = useMotionStyle()
  const inner = useComponentMotion({
    name: 'useMotion(list)',
    role: 'list',
    key: 'list',
    mainPart: 'item',
    parts: () => ({}),
    root: () => null,
    motion: () => motion?.() ?? {},
    defaults: () => ({ item: LIST_DEFAULT }),
  })
  const own = () => (motion?.() ?? {}) as { stagger?: number; leaving?: 'pop' | 'hold' }
  const role = () => (style?.value?.list ?? {}) as { stagger?: number; leaving?: 'pop' | 'hold' }
  // The list engine loads on demand, from setup, so it's here long before the list first changes.
  const id = String(++lists)
  let list: ListMotion | undefined
  let mounted = false
  const loading = import('./list').then((module) => {
    list = module.createListMotion({
      id,
      resolved: () => inner.resolved.value,
      stagger: () => own().stagger ?? role().stagger ?? 0.03,
      leaving: () => own().leaving ?? role().leaving ?? 'pop',
    })
    if (mounted) list.ready()
    return list
  })
  // A failed load is handled where it's used; it must not surface as an unhandled rejection.
  loading.catch(() => {})
  // Whichever comes last, mounting or the engine, notes where everything is.
  onMounted(() => {
    mounted = true
    list?.ready()
  })
  onScopeDispose(() => void loading.then((ready) => ready.stop()).catch(() => {}))
  const transition: TransitionProps = {
    css: false,
    // TransitionGroup passes this to its element, so the list finds its box before any change.
    ...({ 'data-ui-list': id } as TransitionProps),
    onBeforeEnter: (el) => list?.hooks.onBeforeEnter(el),
    onBeforeLeave: (el) => list?.hooks.onBeforeLeave(el),
    onEnter(el, done) {
      if (list) return list.hooks.onEnter(el, done)
      // Not loaded yet: hidden meanwhile, then it enters from there.
      const hidden = el.animate([{ opacity: 0 }, { opacity: 0 }], {
        id: PRESENCE_ID,
        duration: 1,
        fill: 'forwards',
      })
      // Couldn't load (offline, a flaky network): the item appears at once.
      loading.then(
        (ready) => ready.hooks.onEnter(el, done),
        () => {
          hidden.cancel()
          done()
        },
      )
    },
    onLeave(el, done) {
      if (list) return list.hooks.onLeave(el, done)
      loading.then(
        (ready) => ready.hooks.onLeave(el, done),
        () => done(),
      )
    },
  }
  return {
    transition,
    part: () => () => {},
    target: inner.target,
    get phase() {
      return inner.phase.value
    },
  }
}
