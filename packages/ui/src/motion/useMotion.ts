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

interface ComponentListOptions {
  /** Its key in a shared style (`fileUpload`); the `list` role's values apply under it. */
  key?: keyof MotionStyle
  /** The items' part name (`row`, `chip`, `toast`). */
  part?: string
  /** Shown in warnings. */
  name?: string
  /** The built-in look, for what your values leave out. */
  look?: MotionValues | (() => MotionValues)
  /** How leaving items go by default: `'hold'` for items already placed by hand (a fan). */
  leaving?: 'pop' | 'hold'
  /** The component places its items itself (a toast stack): no height to follow, no slides. */
  arranged?: boolean
  /** An item's own parts (a timeline step's `marker`): handed to hooks, and values play on them. */
  parts?: (el: HTMLElement) => Record<string, HTMLElement | null>
}

/**
 * @internal A component's own list (rows, chips, toasts) on the motion system: bind `transition`
 * to its TransitionGroup when `motion` is yours (an object) or a shared style reaches it; otherwise
 * it keeps its own CSS and this is never called.
 */
export function useComponentList<N extends string = string>(
  motion: () => unknown,
  as: ComponentListOptions,
): UseMotionReturn<N> {
  return useListMotion<N>(motion, as)
}
let lists = 0
// Not an item: a decorative child of the list, such as its sliding highlight.
const decorative = (el: Element) => el.getAttribute('aria-hidden') === 'true'

/**
 * `useMotion('list')` on a `<TransitionGroup>`: items stagger in, leave lifted out where they were,
 * the rest slide into place, and the list's box follows its height. Keys: `initial.item`,
 * `exit.item`, `stagger`, `leaving`.
 */
function useListMotion<N extends string>(
  motion?: () => unknown,
  as: ComponentListOptions = {},
): UseMotionReturn<N> {
  const style = useMotionStyle()
  const part = as.part ?? 'item'
  const inner = useComponentMotion({
    name: as.name ?? 'useMotion(list)',
    role: 'list',
    key: as.key ?? 'list',
    mainPart: part,
    parts: () => ({}),
    root: () => null,
    motion: () => motion?.() ?? {},
    defaults: () => ({
      [part]: (typeof as.look === 'function' ? as.look() : as.look) ?? LIST_DEFAULT,
    }),
  })
  type ListOptions = { stagger?: number; leaving?: 'pop' | 'hold'; appear?: boolean }
  const own = () => (motion?.() ?? {}) as ListOptions
  const role = () => (style?.value?.list ?? {}) as ListOptions
  // The list engine loads on demand, from setup, so it's here long before the list first changes.
  const id = String(++lists)
  let list: ListMotion | undefined
  let mounted = false
  const loading = import('./list').then((module) => {
    list = module.createListMotion({
      id,
      part,
      name: as.name,
      arranged: as.arranged,
      parts: as.parts,
      resolved: () => inner.resolved.value,
      stagger: () => own().stagger ?? role().stagger ?? 0.03,
      leaving: () => own().leaving ?? role().leaving ?? as.leaving ?? 'pop',
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
    // Read as it renders: the items there when the list mounts (an opening) enter too. Hydration
    // never runs it (tested), so server-rendered items stay as they are.
    get appear() {
      return own().appear ?? role().appear ?? false
    },
    // TransitionGroup passes this to its element, so the list finds its box before any change.
    ...({ 'data-ui-list': id } as TransitionProps),
    onBeforeEnter: (el) => list?.hooks.onBeforeEnter(el),
    onBeforeLeave: (el) => list?.hooks.onBeforeLeave(el),
    onEnter(el, done) {
      if (decorative(el)) return done()
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
      if (decorative(el)) return done()
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
