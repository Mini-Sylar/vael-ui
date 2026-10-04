/** Pure composable-level behavior — queue mutation, variants, promise flow. */
import { expect, expectTypeOf, test, vi } from 'vitest'
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

test('setWaiting holds a timer with its remaining time, and releasing it resumes', async () => {
  const { toasts, setWaiting } = useToastQueue()
  const id = toast('Held', { duration: 80 })
  setWaiting([id])
  await new Promise((r) => setTimeout(r, 200))
  expect(toasts.some((t) => t.id === id)).toBe(true)

  setWaiting([])
  await vi.waitFor(() => expect(toasts.some((t) => t.id === id)).toBe(false), { timeout: 2000 })
})

test('pinned defaults to false and carries through toast.promise', async () => {
  const { toasts } = useToastQueue()
  const id = toast('Plain')
  expect(toasts.find((t) => t.id === id)!.pinned).toBe(false)
  await toast.promise(
    Promise.resolve(),
    { loading: 'L', success: 'Pinned done', error: 'E' },
    {
      pinned: true,
    },
  )
  await vi.waitFor(() => expect(toasts.find((t) => t.title === 'Pinned done')?.pinned).toBe(true))
  dismissAll()
})

test('your own id updates the toast on screen instead of adding a second one', () => {
  const { toasts } = useToastQueue()
  const before = toast('Before')
  const first = toast.warning('Verify your email', { id: 'verify-email', duration: Infinity })
  const after = toast('After')
  expect(first).toBe('verify-email')

  const again = toast.error('Email still unverified', { id: 'verify-email', pinned: true })
  expect(again).toBe('verify-email')
  const matches = toasts.filter((t) => t.id === 'verify-email')
  expect(matches.length).toBe(1)
  expect(matches[0]).toMatchObject({
    title: 'Email still unverified',
    variant: 'error',
    duration: 4000,
    pinned: true,
  })
  // It keeps its place in the queue.
  expect(toasts.map((t) => t.id)).toEqual([before, 'verify-email', after])

  toast.dismiss('verify-email')
  expect(toasts.some((t) => t.id === 'verify-email')).toBe(false)
  dismissAll()
})

test("updating by id restarts the toast's timer", async () => {
  const { toasts } = useToastQueue()
  toast('Short', { id: 'restart', duration: 150 })
  await new Promise((r) => setTimeout(r, 100))
  toast('Short again', { id: 'restart', duration: 150 })
  await new Promise((r) => setTimeout(r, 100))
  // 200ms after the first call, past its 150ms: still here because the update restarted it.
  expect(toasts.some((t) => t.id === 'restart')).toBe(true)
  await vi.waitFor(() => expect(toasts.some((t) => t.id === 'restart')).toBe(false), {
    timeout: 2000,
  })
})

test("a custom id '0' never touches the automatic toast with id 0", () => {
  const { toasts } = useToastQueue()
  const auto = toast('Automatic')
  toast('Custom', { id: String(auto) })
  expect(toasts.find((t) => t.id === auto)!.title).toBe('Automatic')
  expect(toasts.find((t) => t.id === String(auto))!.title).toBe('Custom')
  toast.dismiss(String(auto))
  expect(toasts.some((t) => t.id === auto)).toBe(true)
  dismissAll()
})

test('toast.promise with an id updates one toast from loading to its result', async () => {
  const { toasts } = useToastQueue()
  let resolveTask!: () => void
  const task = new Promise<void>((resolve) => (resolveTask = resolve))
  toast.promise(task, { loading: 'Saving…', success: 'Saved', error: 'Failed' }, { id: 'save' })
  expect(toasts.find((t) => t.id === 'save')!.variant).toBe('loading')
  resolveTask()
  await task
  await vi.waitFor(() => expect(toasts.find((t) => t.id === 'save')?.title).toBe('Saved'))
  expect(toasts.filter((t) => t.id === 'save').length).toBe(1)
  dismissAll()
})

test('toast() returns a number without an id and your string with one', () => {
  expectTypeOf(toast('A')).toEqualTypeOf<number>()
  expectTypeOf(toast.success('A', { id: 'a' })).toEqualTypeOf<string>()
  dismissAll()
})
