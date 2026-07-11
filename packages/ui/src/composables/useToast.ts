import { reactive, readonly } from 'vue'
import type { DeepReadonly } from 'vue'

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastOptions {
  description?: string
  variant?: ToastVariant
  /** ms. Defaults to 4000, or `Infinity` for `loading` toasts (dismissed programmatically). */
  duration?: number
  action?: { label: string; onClick: () => void }
}

export interface ToastEntry {
  id: number
  title: string
  description?: string
  variant: ToastVariant
  duration: number
  action?: ToastOptions['action']
}

interface InternalEntry extends ToastEntry {
  remaining: number
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
  if (!Number.isFinite(entry.duration) || entry.remaining <= 0) return
  clearTimer(entry)
  entry.segmentStartedAt = performance.now()
  entry.timer = setTimeout(() => dismiss(entry.id), entry.remaining)
}

function pauseTimer(entry: InternalEntry) {
  if (entry.timer == null) return
  entry.remaining = Math.max(0, entry.remaining - (performance.now() - entry.segmentStartedAt))
  clearTimer(entry)
}

function pushToast(title: string, options: ToastOptions = {}): number {
  const id = nextId++
  const variant = options.variant ?? 'default'
  const duration = options.duration ?? (variant === 'loading' ? Infinity : 4000)
  const entry: InternalEntry = {
    id,
    title,
    description: options.description,
    variant,
    duration,
    action: options.action,
    remaining: duration,
    timer: null,
    segmentStartedAt: 0,
  }
  queue.push(entry)
  scheduleTimer(entry)
  return id
}

function dismiss(id?: number) {
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
  settled.then(
    (data) => {
      dismiss(id)
      const text =
        typeof messages.success === 'function' ? messages.success(data) : messages.success
      pushToast(text, { ...options, variant: 'success' })
    },
    (error: unknown) => {
      dismiss(id)
      const text = typeof messages.error === 'function' ? messages.error(error) : messages.error
      pushToast(text, { ...options, variant: 'error' })
    },
  )
  return settled
}

export interface ToastFn {
  (title: string, options?: ToastOptions): number
  success: (title: string, options?: ToastOptions) => number
  error: (title: string, options?: ToastOptions) => number
  warning: (title: string, options?: ToastOptions) => number
  info: (title: string, options?: ToastOptions) => number
  loading: (title: string, options?: ToastOptions) => number
  dismiss: (id?: number) => void
  promise: typeof promise
}

// Sonner-style imperative API: callable anywhere, no context needed.
export const toast: ToastFn = Object.assign(
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
)

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
  }
}
