// The presence registry: which of your elements live inside which component, in page order.
import type { TargetMotion } from './types'

export interface PresenceEntry {
  el: Element
  name: string
  /** What the element asked for (`v-animate`'s value, or a preset name), merged over the component's `targets[name]`. */
  motion?: TargetMotion | string
}

export interface Presence {
  /** Adds an element under a name. Returns its removal. */
  register: (el: Element, name: string, motion?: TargetMotion | string) => () => void
  /** Everything registered, in page order: VDOM and Vapor register in different orders. */
  entries: () => PresenceEntry[]
  /** Set by the component that owns it: an element joining while it's open plays its appearance. */
  joined?: (entry: PresenceEntry) => void
  /** Set by the component: an element's callback, its own and its `targets` entry's merged. */
  /** Runs an element's callback through its component; `false` when the component doesn't list it. */
  after?: (el: Element, kind: 'onStart' | 'onAfterEnter' | 'onAfterLeave') => boolean
}

/** The attribute that marks a presence root, so `v-animate` can find it through the DOM in both builds. */
export const PRESENCE_ATTR = 'data-ui-presence'
/** `target('rows')` stamps its element with this; the component collects them when it enters or leaves. */
export const TARGET_ATTR = 'data-ui-target'

const byRoot = new WeakMap<Element, Presence>()

function createPresence(): Presence {
  const list: PresenceEntry[] = []
  const presence: Presence = {
    register(el, name, motion) {
      // A `:ref` written inline is a new function each render; the same element registers once.
      const existing = list.find((e) => e.el === el && e.name === name)
      const entry = existing ?? { el, name, motion }
      if (existing) existing.motion = motion ?? existing.motion
      else {
        list.push(entry)
        presence.joined?.(entry)
      }
      // Vue unmounts children before the parent's leave runs; keep the entry until the element is gone.
      return () =>
        queueMicrotask(() => {
          const at = list.indexOf(entry)
          if (!el.isConnected && at >= 0) list.splice(at, 1)
        })
    },
    entries() {
      for (let i = list.length - 1; i >= 0; i--) if (!list[i]!.el.isConnected) list.splice(i, 1)
      return [...list].sort((a, b) =>
        a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      )
    },
  }
  return presence
}

/** The presence for a root element, created on first sight: children often register before their parent. */
export function presenceFor(root: Element): Presence {
  let presence = byRoot.get(root)
  if (!presence) {
    presence = createPresence()
    byRoot.set(root, presence)
  }
  return presence
}

/**
 * Everything that belongs to a root, in page order: `v-animate` registrations, elements `target()`
 * stamped, and the ones your targets' `select` finds (rows a component renders from data).
 * Read at enter/leave time, so it doesn't matter that Vue calls function refs before the root has its marker.
 */
export function collectEntries(
  root: Element,
  targets: Record<string, TargetMotion> = {},
): PresenceEntry[] {
  const registered = presenceFor(root).entries()
  const seen = new Set(registered.map((entry) => entry.el))
  const stamped: PresenceEntry[] = []
  const take = (selector: string, name: (el: Element) => string) => {
    for (const el of root.querySelectorAll(selector)) {
      // Elements inside a nested component belong to that component.
      if (seen.has(el) || el.parentElement?.closest(`[${PRESENCE_ATTR}]`) !== root) continue
      seen.add(el)
      stamped.push({ el, name: name(el) })
    }
  }
  take(`[${TARGET_ATTR}]`, (el) => el.getAttribute(TARGET_ATTR)!)
  for (const [name, t] of Object.entries(targets)) if (t.select) take(t.select, () => name)
  return [...registered, ...stamped].sort((a, b) =>
    a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  )
}

/** The nearest presence above an element, through the DOM (teleported panels carry their own marker). */
export function findPresence(el: Element): Presence | undefined {
  const root = el.closest(`[${PRESENCE_ATTR}]`)
  return root ? presenceFor(root) : undefined
}

/**
 * The element behind a template ref: an element, a vael-ui component (`el`), a VDOM component
 * (`$el`), or a Vapor component (`block`). Null for a component whose root isn't one element.
 */
export function refElement(raw: unknown): Element | null {
  if (!raw || typeof raw !== 'object') return null
  if (raw instanceof Element) return raw
  for (const key of ['el', '$el', 'block'] as const) {
    const value = (raw as Record<string, unknown>)[key]
    if (value instanceof Element) return value
  }
  return null
}
