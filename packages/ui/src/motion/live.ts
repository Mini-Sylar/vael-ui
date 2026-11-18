// `v-animate`'s live values: a getter or a ref in `animate`, followed every frame without
// re-rendering the component, exactly or on a spring. How fast each one moves is published on the
// element, so an exit that takes over carries on at that speed.
import { isRef, shallowRef, toValue, watchEffect } from 'vue'
import type { ShallowRef } from 'vue'
import { springOf } from './springNames'
import { createSpring } from './useSpringValue'
import type { SpringHandle } from './useSpringValue'
import type { MotionValues, Spring, SpringName } from './types'
import { toKeyframe } from './values'
import { createVelocityTracker, publishSpeed } from './velocity'
import type { VelocityTracker } from './velocity'

interface LiveEntry {
  read: () => unknown
  spring?: Spring | SpringName
}

const isLive = (raw: unknown) => typeof raw === 'function' || isRef(raw)

// The CSS property a value is written into, when it shares one with others.
const TURNS = ['perspective', 'rotateX', 'rotateY', 'scaleX', 'scaleY', 'scaleZ', 'skewX', 'skewY']
const shares = (key: string) =>
  key === 'x' || key === 'y' ? 'translate' : TURNS.includes(key) ? 'transform' : undefined

/** A value from `animate` that's live, and how to read it; undefined for a fixed one. */
function liveOf(raw: unknown): LiveEntry | undefined {
  if (isLive(raw)) return { read: () => toValue(raw as () => unknown) }
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw) {
    const { value, spring } = raw as { value: unknown; spring?: Spring | SpringName }
    if (isLive(value)) return { read: () => toValue(value as () => unknown), spring }
  }
  return undefined
}

/** `animate` split into the values it follows and the ones it holds. */
export function splitLive(values: Record<string, unknown> | undefined): {
  live: Record<string, LiveEntry>
  fixed: MotionValues | undefined
} {
  const live: Record<string, LiveEntry> = {}
  const fixed: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(values ?? {})) {
    const entry = liveOf(raw)
    if (entry) live[key] = entry
    else fixed[key] = raw
  }
  return {
    live,
    fixed: values && Object.keys(fixed).length ? (fixed as MotionValues) : undefined,
  }
}

interface Follower {
  readers: Record<string, LiveEntry>
  shape: string
  bump: ShallowRef<number>
  stop: () => void
  /** The CSS its values make now, by property name. */
  style: () => Record<string, string>
}
// `_uiLiveStyle`: read by the CSS engine (which doesn't import this) when it puts styles back.
type Following = HTMLElement & { _uiLive?: Follower; _uiLiveStyle?: () => Record<string, string> }

const shapeOf = (live: Record<string, LiveEntry>) =>
  JSON.stringify(Object.entries(live).map(([key, entry]) => [key, entry.spring ?? null]))

/**
 * Follows `live` on `el`; with none, stops following. `keep` names the keys a held look now
 * covers, which stay as they are for it to take over from. `instant`: no springs (motion off).
 */
export function followLive(
  el: HTMLElement,
  live: Record<string, LiveEntry>,
  keep: readonly string[],
  instant: () => boolean,
): void {
  const at = el as Following
  const now = at._uiLive
  if (now && Object.keys(live).length && now.shape === shapeOf(live)) {
    // Same values, new getters (an inline one each render): swapped without starting over.
    now.readers = live
    now.bump.value++
    return
  }
  now?.stop()
  at._uiLive = at._uiLiveStyle = undefined
  if (!Object.keys(live).length) return

  const rtl = getComputedStyle(el).direction === 'rtl'
  const current: Record<string, unknown> = {}
  const springs = new Map<string, SpringHandle>()
  const trackers = new Map<string, VelocityTracker>()
  const written = new Set<string>()
  // Only the CSS that changed is written: something else may own the rest of the element's style
  // (a drag moving it by `translate` while a live value turns it).
  const changed = new Set<string>()
  const write = () => {
    if (!changed.size) return
    const keys = new Set(changed)
    changed.clear()
    // Values that share one property (x and y, the turns) are written together.
    for (const key of Object.keys(current))
      if (keys.has(key) || (shares(key) && [...keys].some((k) => shares(k) === shares(key))))
        keys.add(key)
    const frame = toKeyframe(
      Object.fromEntries([...keys].map((key) => [key, current[key]])) as MotionValues,
      rtl,
    ) as Record<string, unknown>
    for (const [prop, value] of Object.entries(frame)) {
      ;(el.style as unknown as Record<string, string>)[prop] = String(value)
      written.add(prop)
    }
  }
  // Each number's speed, from what it was given (or where its spring put it) over time.
  const begin = (key: string, value: number) => {
    const fresh = createVelocityTracker()
    fresh.reset(value)
    trackers.set(key, fresh)
    return fresh
  }
  const note = (key: string, value: unknown) => {
    if (Object.is(current[key], value) && key in current) return
    current[key] = value
    changed.add(key)
    if (typeof value === 'number') (trackers.get(key) ?? begin(key, value)).add(value)
  }
  const follower: Follower = {
    readers: live,
    shape: shapeOf(live),
    bump: shallowRef(0),
    stop: () => {},
    style: () => {
      const frame = toKeyframe(current as MotionValues, rtl) as Record<string, unknown>
      return Object.fromEntries(
        Object.entries(frame).map(([prop, value]) => [
          prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
          String(value),
        ]),
      )
    },
  }
  for (const [key, entry] of Object.entries(live)) {
    if (!entry.spring) continue
    const start = Number(entry.read())
    current[key] = start
    changed.add(key)
    begin(key, start)
    springs.set(
      key,
      createSpring(start, { ...springOf(entry.spring), epsilon: 0.01 }, (value) => {
        note(key, value)
        write()
      }),
    )
  }
  const effect = watchEffect(
    () => {
      void follower.bump.value
      for (const [key, entry] of Object.entries(follower.readers)) {
        const value = entry.read()
        const spring = springs.get(key)
        if (!spring) note(key, value)
        else if (instant()) spring.jump(Number(value))
        else spring.set(Number(value))
      }
      write()
    },
    { flush: 'sync' },
  )
  const unpublish = publishSpeed(el, () => {
    const out: Record<string, number> = {}
    for (const [key, t] of trackers) out[key] = springs.get(key)?.velocity ?? t.velocity() * 1000
    return out
  })
  follower.stop = () => {
    effect()
    unpublish()
    for (const spring of springs.values()) spring.destroy()
    // What no held look takes over goes back to the element's own style.
    const kept = new Set(Object.keys(toKeyframe(Object.fromEntries(keep.map((k) => [k, 0])))))
    for (const prop of written)
      if (!kept.has(prop)) (el.style as unknown as Record<string, string>)[prop] = ''
  }
  at._uiLive = follower
  at._uiLiveStyle = follower.style
}
