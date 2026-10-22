import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { h, nextTick, shallowRef } from 'vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import type { BeforeClose, CloseContext } from '../src/motion/types'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

function dialog(beforeClose: BeforeClose<string>) {
  const open = shallowRef(true)
  const screen = render({
    setup: () => () =>
      h(Dialog as never, {
        open: open.value,
        'onUpdate:open': (v: boolean) => (open.value = v),
        title: 'Discard?',
        beforeClose,
      }),
  })
  const state = () => document.querySelector<HTMLElement>('.ui-dialog')?.dataset.state
  return { open, screen, state }
}

test('true closes, false stays open, and the guard learns why it was asked', async () => {
  const reasons: string[] = []
  let allow = false
  const { open, state } = dialog(({ reason }) => (reasons.push(reason), allow))
  await vi.waitFor(() => expect(state()).toBe('open'))
  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(reasons).toEqual(['escape']))
  expect(open.value).toBe(true)
  expect(state()).toBe('open')
  allow = true
  document.querySelector<HTMLElement>('.ui-dialog-close')!.click()
  await vi.waitFor(() => expect(open.value).toBe(false))
  expect(reasons).toEqual(['escape', 'trigger'])
})

test('a pending promise holds the dialog in "closing", then closes or stays open', async () => {
  let answer!: (allowed: boolean) => void
  const { open, state } = dialog(() => new Promise<boolean>((resolve) => (answer = resolve)))
  await vi.waitFor(() => expect(state()).toBe('open'))
  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(state()).toBe('closing'))
  // Asking again while it's pending doesn't ask twice.
  await userEvent.keyboard('{Escape}')
  answer(false)
  await vi.waitFor(() => expect(state()).toBe('open'))
  expect(open.value).toBe(true)

  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(state()).toBe('closing'))
  answer(true)
  await vi.waitFor(() => expect(open.value).toBe(false))
})

test('a guard that throws or rejects keeps the dialog open, with a warning', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const { open, state } = dialog(() => {
    throw new Error('network down')
  })
  await vi.waitFor(() => expect(state()).toBe('open'))
  await userEvent.keyboard('{Escape}')
  await nextTick()
  expect(open.value).toBe(true)
  expect(state()).toBe('open')
  expect(warn.mock.calls.flat().join(' ')).toContain('network down')

  document.body.innerHTML = ''
  const rejecting = dialog(() => Promise.reject(new Error('timeout')))
  await vi.waitFor(() => expect(rejecting.state()).toBe('open'))
  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(rejecting.state()).toBe('open'))
  expect(rejecting.open.value).toBe(true)
})

test('cancelClose keeps it open and voids a late answer', async () => {
  let answer!: (allowed: boolean) => void
  const open = shallowRef(true)
  const api = shallowRef<{ cancelClose: () => void } | null>(null)
  render({
    setup: () => () =>
      h(Dialog as never, {
        ref: (el: unknown) => (api.value = el as { cancelClose: () => void } | null),
        open: open.value,
        'onUpdate:open': (v: boolean) => (open.value = v),
        title: 'Discard?',
        beforeClose: () => new Promise<boolean>((resolve) => (answer = resolve)),
      }),
  })
  const state = () => document.querySelector<HTMLElement>('.ui-dialog')?.dataset.state
  await vi.waitFor(() => expect(state()).toBe('open'))
  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(state()).toBe('closing'))
  api.value!.cancelClose()
  await vi.waitFor(() => expect(state()).toBe('open'))
  answer(true)
  for (let i = 0; i < 5; i++) await nextTick()
  expect(open.value).toBe(true)
})

test('the old beforeClose(done) still works, with one deprecation warning', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  let done!: CloseContext<string>
  const { open, state } = dialog((context) => void (done = context))
  await vi.waitFor(() => expect(state()).toBe('open'))
  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(state()).toBe('closing'))
  done()
  await vi.waitFor(() => expect(open.value).toBe(false))
  expect(warn.mock.calls.flat().join(' ')).toContain('beforeClose(done) is deprecated')
})

test('old code that returns something, like (done) => list.push(done), still waits for done()', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  const captured: (() => void)[] = []
  const pushes = ((done: () => void) => captured.push(done)) as unknown as BeforeClose<string>
  const { open, state } = dialog(pushes)
  await vi.waitFor(() => expect(state()).toBe('open'))
  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(state()).toBe('closing'))
  captured[0]!()
  await vi.waitFor(() => expect(open.value).toBe(false))
})
