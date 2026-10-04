import { reactive, readonly } from 'vue'
import type { DeepReadonly } from 'vue'

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
}

export interface ToastEntry {
  id: ToastId
  title: string
  description?: string
  variant: ToastVariant
  duration: number
  action?: ToastOptions['action']
  pinned: boolean
}

interface InternalEntry extends ToastEntry {
  remaining: number
  /** Held off-screen past the Toaster's `maxVisible`; its timer waits until it shows. */
  waiting: boolean
  timer: ReturnType<typeof setTimeout> | null
  segmentStartedAt: number
}

// Module-level singleton (like scroll-lock counter and layer stack)
let nextId = 0
const queue = reactive<InternalEntry[]>([])

function clearTimer(entry: InternalEntry) {
  if (entry.timer != null) {
    clearTimeout(entry.timer)
    entry.timer = null
  }
}

function scheduleTimer(entry: InternalEntry) {
  if (entry.timer != null) return
  if (entry.waiting || !Number.isFinite(entry.duration) || entry.remaining <= 0) return
  entry.segmentStartedAt = performance.now()
  entry.timer = setTimeout(() => dismiss(entry.id), entry.remaining)
}

function pauseTimer(entry: InternalEntry) {
  if (entry.timer == null) return
  entry.remaining = Math.max(0, entry.remaining - (performance.now() - entry.segmentStartedAt))
  clearTimer(entry)
}

function pushToast(title: string, options: ToastOptions = {}): ToastId {
  const variant = options.variant ?? 'default'
  const duration = options.duration ?? (variant === 'loading' ? Infinity : 4000)
  const existing = options.id === undefined ? undefined : queue.find((t) => t.id === options.id)
  if (existing) {
    // Same id: update the toast where it is, so it doesn't jump in the stack.
    clearTimer(existing)
    Object.assign(existing, {
      title,
      description: options.description,
      variant,
      duration,
      action: options.action,
      pinned: options.pinned ?? false,
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
    remaining: duration,
    waiting: false,
    timer: null,
    segmentStartedAt: 0,
  }
  queue.push(entry)
  scheduleTimer(entry)
  return id
}

function dismiss(id?: ToastId) {
  if (id === undefined) {
    for (const entry of queue) clearTimer(entry)
    queue.splice(0, queue.length)
    return
  }
  const index = queue.findIndex((entry) => entry.id === id)
  if (index === -1) return
  clearTimer(queue[index])
  queue.splice(index, 1)
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
  // With your own id the result updates the loading toast in place; otherwise it replaces it.
  const replace = () => {
    if (options?.id === undefined) dismiss(id)
  }
  settled.then(
    (data) => {
      replace()
      const text =
        typeof messages.success === 'function' ? messages.success(data) : messages.success
      pushToast(text, { ...options, variant: 'success' })
    },
    (error: unknown) => {
      replace()
      const text = typeof messages.error === 'function' ? messages.error(error) : messages.error
      pushToast(text, { ...options, variant: 'error' })
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

// Pause/resume all toasts; per-toast timers resume instead of restarting.
export function useToastQueue() {
  return {
    toasts: readonly(queue) as DeepReadonly<ToastEntry[]>,
    dismiss,
    pauseAll: () => {
      for (const entry of queue) pauseTimer(entry)
    },
    resumeAll: () => {
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
