/** Pure composable-level behavior — queue mutation, variants, promise flow. */
import { expect, test, vi } from 'vitest'
import { toast, useToastQueue } from '../src/composables/useToast'

const { dismiss: dismissAll } = useToastQueue()

test('toast() adds a default-variant entry with the default 4000ms duration', () => {
  const { toasts, dismiss } = useToastQueue()
  const id = toast('Saved')
  const entry = toasts.find((t) => t.id === id)!
  expect(entry.title).toBe('Saved')
  expect(entry.variant).toBe('default')
  expect(entry.duration).toBe(4000)
  dismiss(id)
})

test('shorthand methods set the right variant; loading defaults to no auto-dismiss', () => {
  const { toasts, dismiss } = useToastQueue()
  const successId = toast.success('Done')
  const errorId = toast.error('Failed')
  const loadingId = toast.loading('Working…')

  expect(toasts.find((t) => t.id === successId)!.variant).toBe('success')
  expect(toasts.find((t) => t.id === errorId)!.variant).toBe('error')
  const loadingEntry = toasts.find((t) => t.id === loadingId)!
  expect(loadingEntry.variant).toBe('loading')
  expect(loadingEntry.duration).toBe(Infinity)

  dismiss()
})

test('dismiss(id) removes only that toast; dismiss() with no id clears everything', () => {
  const { toasts, dismiss } = useToastQueue()
  const a = toast('A')
  const b = toast('B')
  dismiss(a)
  expect(toasts.some((t) => t.id === a)).toBe(false)
  expect(toasts.some((t) => t.id === b)).toBe(true)

  dismiss()
  expect(toasts.length).toBe(0)
})

test('an entry auto-dismisses after its duration elapses', async () => {
  const { toasts } = useToastQueue()
  const id = toast('Short-lived', { duration: 40 })
  expect(toasts.some((t) => t.id === id)).toBe(true)
  await vi.waitFor(() => expect(toasts.some((t) => t.id === id)).toBe(false), { timeout: 2000 })
})

test('toast.promise: resolves replaces the loading toast with success', async () => {
  const { toasts } = useToastQueue()
  let resolveTask!: (v: string) => void
  const task = new Promise<string>((resolve) => (resolveTask = resolve))

  const settled = toast.promise(task, {
    loading: 'Saving…',
    success: (data) => `Saved: ${data}`,
    error: 'Failed',
  })

  await vi.waitFor(() => expect(toasts.some((t) => t.title === 'Saving…')).toBe(true))
  resolveTask('project.json')
  await settled

  await vi.waitFor(() => expect(toasts.some((t) => t.title === 'Saved: project.json')).toBe(true))
  expect(toasts.some((t) => t.title === 'Saving…')).toBe(false)
  const finalEntry = toasts.find((t) => t.title === 'Saved: project.json')!
  expect(finalEntry.variant).toBe('success')
  dismissAll()
})

test('toast.promise: rejection replaces the loading toast with error', async () => {
  const { toasts } = useToastQueue()
  const task = Promise.reject(new Error('nope'))

  toast
    .promise(task, { loading: 'Saving…', success: 'Saved', error: 'Could not save' })
    .catch(() => {})

  await vi.waitFor(() => expect(toasts.some((t) => t.title === 'Could not save')).toBe(true))
  const entry = toasts.find((t) => t.title === 'Could not save')!
  expect(entry.variant).toBe('error')
  dismissAll()
})
