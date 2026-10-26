import { getCurrentScope, onScopeDispose, reactive, readonly } from 'vue'
import type { DeepReadonly } from 'vue'
import { isClient } from '@vueuse/core'

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading'

/** A number vael-ui assigns, or the string you pass as `id`. */
export type ToastId = number | string

export interface ToastOptions {
  /** Your own id for the toast. Showing a toast with an id that's already on screen updates that
   * toast and restarts its timer instead of adding a second one. Pass it to `toast.dismiss(id)`. */
  id?: string
  description?: string
  variant?: ToastVariant
  /** ms. Defaults to 4000, or `Infinity` for `loading` toasts (dismissed programmatically). */
  duration?: number
  action?: { label: string; onClick: () => void }
  /** Shows the toast in its own section beside the stack, where newer toasts can't cover it. It
   * doesn't count toward `maxVisible`. Pair with `duration: Infinity` to keep it until someone
   * closes it. */
  pinned?: boolean
  /**
   * Sends the toast to the `<Toaster>` with this `name`, instead of the unnamed one.
   * @example
   * ```ts
   * toast('Copied', { toaster: 'editor' })
   * ```
   */
  toaster?: string
}

export interface ToastEntry {
  id: ToastId
  title: string
  description?: string
  variant: ToastVariant
  duration: number
  action?: ToastOptions['action']
  pinned: boolean
  /** The `name` of the `<Toaster>` this toast shows in, or `undefined` for the unnamed one. */
  toaster?: string
}

interface InternalEntry extends ToastEntry {
  remaining: number
  /** Held off-screen past the Toaster's `maxVisible`; its timer waits until it shows. */
  waiting: boolean
  timer: ReturnType<typeof setTimeout> | null
  segmentStartedAt: number
}

// Module-level, like the scroll-lock counter. One queue per Toaster `name`.
let nextId = 0
const queues = new Map<string | undefined, InternalEntry[]>()
// Queues whose Toaster is hovered, focused or in a hidden tab: new toasts there wait too.
const pausedQueues = new Set<string | undefined>()
// How many live scopes hold each queue; Infinity once a call outside any scope holds it.
const holders = new Map<string | undefined, number>()

function queueOf(toaster: string | undefined) {
  let queue = queues.get(toaster)
  if (!queue) {
    queue = reactive<InternalEntry[]>([])
    queues.set(toaster, queue)
  }
  return queue
}

// Drops empty queues so generated Toaster names don't pile up; a queue holding toasts stays.
function dropIfUnused(toaster: string | undefined) {
  if (queues.get(toaster)?.length === 0 && !holders.get(toaster)) queues.delete(toaster)
}

// Ids are unique across every Toaster, so look in all queues.
function findEntry(id: ToastId) {
  for (const queue of queues.values()) {
    const entry = queue.find((t) => t.id === id)
    if (entry) return { queue, entry }
  }
  return undefined
}

function clearTimer(entry: InternalEntry) {
  if (entry.timer != null) {
    clearTimeout(entry.timer)
    entry.timer = null
  }
}

function scheduleTimer(entry: InternalEntry) {
  if (entry.timer != null) return
  if (entry.waiting || !Number.isFinite(entry.duration) || entry.remaining <= 0) return
  if (pausedQueues.has(entry.toaster)) return
  entry.segmentStartedAt = performance.now()
  entry.timer = setTimeout(() => dismiss(entry.id), entry.remaining)
}

function pauseTimer(entry: InternalEntry) {
  if (entry.timer == null) return
  entry.remaining = Math.max(0, entry.remaining - (performance.now() - entry.segmentStartedAt))
  clearTimer(entry)
}

// Internally a toast can be updated by vael-ui's own numeric id too (a promise toast settling).
function pushToast(
  title: string,
  options: Omit<ToastOptions, 'id'> & { id?: ToastId } = {},
): ToastId {
  // One server queue would reach every request; the browser runs this call again on hydration.
  if (!isClient) return options.id ?? nextId++
  const variant = options.variant ?? 'default'
  const duration = options.duration ?? (variant === 'loading' ? Infinity : 4000)
  const queue = queueOf(options.toaster)
  const found = options.id === undefined ? undefined : findEntry(options.id)
  if (found) {
    // Same id: update the toast where it is, so it doesn't jump in the stack.
    const existing = found.entry
    clearTimer(existing)
    if (found.queue !== queue) {
      // A new `toaster` moves it to the end of that Toaster's stack.
      found.queue.splice(found.queue.indexOf(existing), 1)
      dropIfUnused(existing.toaster)
      existing.waiting = false
      queue.push(existing)
    }
    Object.assign(existing, {
      title,
      description: options.description,
      variant,
      duration,
      action: options.action,
      pinned: options.pinned ?? false,
      toaster: options.toaster,
      remaining: duration,
    })
    scheduleTimer(existing)
    return existing.id
  }
  const id = options.id ?? nextId++
  const entry: InternalEntry = {
    id,
    title,
    description: options.description,
    variant,
    duration,
    action: options.action,
    pinned: options.pinned ?? false,
    toaster: options.toaster,
    remaining: duration,
    waiting: false,
    timer: null,
    segmentStartedAt: 0,
  }
  queue.push(entry)
  scheduleTimer(entry)
  return id
}

function clearQueue(queue: InternalEntry[], toaster: string | undefined) {
  for (const entry of queue) clearTimer(entry)
  queue.splice(0, queue.length)
  dropIfUnused(toaster)
}

function removeFrom(queue: InternalEntry[], id: ToastId) {
  const index = queue.findIndex((entry) => entry.id === id)
  if (index === -1) return
  const { toaster } = queue[index]
  clearTimer(queue[index])
  queue.splice(index, 1)
  dropIfUnused(toaster)
}

function dismiss(id?: ToastId) {
  if (id === undefined) {
    for (const [toaster, queue] of queues) clearQueue(queue, toaster)
    return
  }
  const found = findEntry(id)
  if (found) removeFrom(found.queue, id)
}

interface PromiseMessages<T> {
  loading: string
  success: string | ((data: T) => string)
  error: string | ((error: unknown) => string)
}

function promise<T>(
  input: Promise<T> | (() => Promise<T>),
  messages: PromiseMessages<T>,
  options?: ToastOptions,
): Promise<T> {
  const id = pushToast(messages.loading, { ...options, variant: 'loading', duration: Infinity })
  const settled = typeof input === 'function' ? input() : input
  // The result updates the loading toast in place: it stays where it is in the stack, and its
  // move into `success` or `error` plays the Toaster's `states`.
  settled.then(
    (data) => {
      const text =
        typeof messages.success === 'function' ? messages.success(data) : messages.success
      pushToast(text, { ...options, id, variant: 'success' })
    },
    (error: unknown) => {
      const text = typeof messages.error === 'function' ? messages.error(error) : messages.error
      pushToast(text, { ...options, id, variant: 'error' })
    },
  )
  return settled
}

/** Returns your `id` when you pass one, otherwise the number vael-ui assigns. */
export interface ToastCall {
  (title: string, options: ToastOptions & { id: string }): string
  (title: string, options?: ToastOptions): number
}

export interface ToastFn extends ToastCall {
  success: ToastCall
  error: ToastCall
  warning: ToastCall
  info: ToastCall
  loading: ToastCall
  dismiss: (id?: ToastId) => void
  promise: typeof promise
}

// Sonner-style imperative API: callable anywhere, no context needed.
export const toast = Object.assign(
  (title: string, options?: ToastOptions) => pushToast(title, options),
  {
    success: (title: string, options?: ToastOptions) =>
      pushToast(title, { ...options, variant: 'success' as const }),
    error: (title: string, options?: ToastOptions) =>
      pushToast(title, { ...options, variant: 'error' as const }),
    warning: (title: string, options?: ToastOptions) =>
      pushToast(title, { ...options, variant: 'warning' as const }),
    info: (title: string, options?: ToastOptions) =>
      pushToast(title, { ...options, variant: 'info' as const }),
    loading: (title: string, options?: ToastOptions) =>
      pushToast(title, {
        ...options,
        variant: 'loading' as const,
        duration: options?.duration ?? Infinity,
      }),
    dismiss,
    promise,
  },
) as ToastFn

/**
 * One Toaster's queue, plus pause and resume. Pass a `name` to read a named Toaster's toasts.
 * @example
 * ```ts
 * const { toasts } = useToastQueue('editor')
 * ```
 */
export function useToastQueue(toaster?: string) {
  const queue = queueOf(toaster)
  if (getCurrentScope()) {
    holders.set(toaster, (holders.get(toaster) ?? 0) + 1)
    onScopeDispose(() => {
      const left = holders.get(toaster)! - 1
      if (left) holders.set(toaster, left)
      else holders.delete(toaster)
      dropIfUnused(toaster)
    })
  } else {
    // Nothing tells us when this caller lets go, so its queue is never dropped.
    holders.set(toaster, Infinity)
  }
  return {
    toasts: readonly(queue) as DeepReadonly<ToastEntry[]>,
    /** Dismisses one of this queue's toasts, or all of them when you omit `id`. */
    dismiss: (id?: ToastId) =>
      id === undefined ? clearQueue(queue, toaster) : removeFrom(queue, id),
    /** Pauses every timer, including those of toasts added before `resumeAll()`. */
    pauseAll: () => {
      pausedQueues.add(toaster)
      for (const entry of queue) pauseTimer(entry)
    },
    resumeAll: () => {
      pausedQueues.delete(toaster)
      for (const entry of queue) scheduleTimer(entry)
    },
    /** Pauses these toasts' timers while they wait off-screen; every other toast's timer resumes. */
    setWaiting: (ids: readonly ToastId[], running = true) => {
      const waiting = new Set(ids)
      for (const entry of queue) {
        entry.waiting = waiting.has(entry.id)
        if (entry.waiting) pauseTimer(entry)
        else if (running) scheduleTimer(entry)
      }
    },
  }
}
