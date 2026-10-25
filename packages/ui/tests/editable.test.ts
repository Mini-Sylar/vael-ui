import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { h, nextTick, ref } from 'vue'
import Editable from '../src/components/Editable/Editable.vue'
import DatePicker from '../src/components/DatePicker/DatePicker.vue'

const preview = (root: HTMLElement) => root.querySelector<HTMLButtonElement>('.ui-editable-preview')
const input = (root: HTMLElement) => root.querySelector<HTMLInputElement>('.ui-editable input')

test('a click opens the input with the text selected; Enter saves and emits submit', async () => {
  const onSubmit = vi.fn()
  const onUpdate = vi.fn()
  const screen = await render(Editable, {
    props: { modelValue: 'Roadmap', onSubmit, 'onUpdate:modelValue': onUpdate },
  })
  expect(preview(screen.container)?.textContent?.trim()).toBe('Roadmap')
  preview(screen.container)!.click()
  await nextTick()
  await nextTick()
  const el = input(screen.container)!
  expect(document.activeElement).toBe(el)
  expect(el.selectionEnd! - el.selectionStart!).toBe('Roadmap'.length)
  await userEvent.keyboard('Plan{Enter}')
  expect(onUpdate).toHaveBeenCalledWith('Plan')
  expect(onSubmit).toHaveBeenCalledWith('Plan')
  await vi.waitFor(() => expect(input(screen.container)).toBeNull())
  expect(document.activeElement).toBe(preview(screen.container))
})

test('Escape drops the draft and emits cancel', async () => {
  const onCancel = vi.fn()
  const onUpdate = vi.fn()
  const screen = await render(Editable, {
    props: { modelValue: 'Keep me', onCancel, 'onUpdate:modelValue': onUpdate },
  })
  preview(screen.container)!.click()
  await nextTick()
  await nextTick()
  await userEvent.keyboard('nope{Escape}')
  expect(onCancel).toHaveBeenCalled()
  expect(onUpdate).not.toHaveBeenCalled()
  await vi.waitFor(() => expect(preview(screen.container)?.textContent?.trim()).toBe('Keep me'))
})

test.each([
  ['both', true],
  ['enter', false],
] as const)('leaving the input with submit-mode=%s saves: %s', async (submitMode, saves) => {
  const onUpdate = vi.fn()
  const screen = await render(Editable, {
    props: { modelValue: 'A', submitMode, 'onUpdate:modelValue': onUpdate },
  })
  preview(screen.container)!.click()
  await nextTick()
  await nextTick()
  await userEvent.keyboard('B')
  input(screen.container)!.blur()
  await nextTick()
  expect(onUpdate.mock.calls.length > 0).toBe(saves)
})

test('empty text shows the placeholder; disabled does not open; the editing model opens it', async () => {
  const screen = await render(Editable, { props: { modelValue: '', placeholder: 'Add a name' } })
  expect(preview(screen.container)?.textContent?.trim()).toBe('Add a name')
  expect(preview(screen.container)?.hasAttribute('data-placeholder')).toBe(true)

  const off = await render(Editable, { props: { modelValue: 'x', disabled: true } })
  preview(off.container)!.click()
  await nextTick()
  expect(input(off.container)).toBeNull()

  const open = await render(Editable, { props: { modelValue: 'x', editing: true } })
  expect(input(open.container)).not.toBeNull()
})

test('opened through the editing model, the input holds the text, and leaving keeps it', async () => {
  const onUpdate = vi.fn()
  const editing = ref(false)
  const screen = await render({
    setup: () => () =>
      h(Editable, {
        modelValue: 'Roadmap',
        editing: editing.value,
        'onUpdate:editing': (v: boolean) => (editing.value = v),
        'onUpdate:modelValue': onUpdate,
      }),
  })
  editing.value = true
  await vi.waitFor(() => expect(input(screen.container)?.value).toBe('Roadmap'))
  input(screen.container)!.focus()
  input(screen.container)!.blur()
  await vi.waitFor(() => expect(input(screen.container)).toBeNull())
  expect(onUpdate).not.toHaveBeenCalledWith('')
})

test('actions in the slot submit without the blur getting there first', async () => {
  const onSubmit = vi.fn()
  const screen = await render(Editable, {
    props: { modelValue: 'A', submitMode: 'enter', onSubmit },
    slots: {
      actions: ({ submit }: { submit: () => void }) =>
        h('button', { class: 'save', onClick: submit }, 'Save'),
    },
  })
  preview(screen.container)!.click()
  await nextTick()
  await nextTick()
  await userEvent.keyboard('B')
  await userEvent.click(screen.container.querySelector('.save')!)
  expect(onSubmit).toHaveBeenCalledWith('B')
})

test('motion=false marks the root and hands over previewEl and inputEl', async () => {
  const captured = ref<InstanceType<typeof Editable> | null>(null)
  const Wrapper = {
    render: () => h(Editable, { modelValue: 'x', motion: false, ref: captured }),
  }
  const screen = await render(Wrapper)
  expect(screen.container.querySelector('.ui-editable')?.getAttribute('data-motion')).toBe('off')
  expect(captured.value?.previewEl).toBeInstanceOf(HTMLButtonElement)
  expect(captured.value?.inputEl).toBeNull()
  captured.value?.start()
  await nextTick()
  await nextTick()
  expect(captured.value?.inputEl).toBeInstanceOf(HTMLInputElement)
})

test('#edit swaps in any control: a textarea keeps Enter, Cmd+Enter saves, Tab to an action does not blur it away', async () => {
  const onSubmit = vi.fn()
  const onCancel = vi.fn()
  const screen = await render(Editable, {
    props: { modelValue: 'one', selectOnFocus: false, onSubmit, onCancel },
    slots: {
      edit: ({ value, update }: { value: string; update: (v: string) => void }) =>
        h('textarea', {
          class: 'note',
          value,
          onInput: (e: Event) => update((e.target as HTMLTextAreaElement).value),
        }),
      actions: ({ cancel }: { cancel: () => void }) =>
        h('button', { class: 'cancel', onClick: cancel }, 'Cancel'),
    },
  })
  preview(screen.container)!.click()
  await nextTick()
  await nextTick()
  const note = screen.container.querySelector<HTMLTextAreaElement>('.note')!
  expect(document.activeElement).toBe(note)
  await userEvent.keyboard('{Enter}two')
  expect(onSubmit).not.toHaveBeenCalled()
  expect(note.value).toBe('one\ntwo')
  await userEvent.tab()
  expect(document.activeElement).toBe(screen.container.querySelector('.cancel'))
  expect(onSubmit).not.toHaveBeenCalled()
  await userEvent.tab({ shift: true })
  await userEvent.keyboard('{Meta>}{Enter}{/Meta}')
  expect(onSubmit).toHaveBeenCalledWith('one\ntwo')
})

test("focus in a picker's teleported panel stays inside the edit; leaving the panel for the page submits", async () => {
  const onSubmit = vi.fn()
  const due = ref('2026-11-06')
  const day = (iso: string) => document.querySelector<HTMLElement>(`[data-date="${iso}"]`)
  const screen = await render({
    setup: () => () =>
      h('div', [
        h(
          Editable,
          {
            modelValue: due.value,
            'onUpdate:modelValue': (v: string) => (due.value = v),
            onSubmit,
            ariaLabel: 'Due',
          },
          {
            edit: ({
              value,
              update,
              submit,
            }: {
              value: string
              update: (v: string) => void
              submit: () => void
            }) =>
              h(DatePicker as never, {
                modelValue: new Date(`${value}T00:00`),
                'onUpdate:modelValue': (next: Date | null) => {
                  if (!next) return
                  update(
                    `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`,
                  )
                  submit()
                },
              }),
          },
        ),
        h('button', { class: 'elsewhere' }, 'Elsewhere'),
      ]),
  })
  const editing = () => screen.container.querySelector('.ui-editable[data-state="editing"]')

  // A pick from the panel saves it.
  preview(screen.container)!.click()
  await vi.waitFor(() => expect(editing()).not.toBeNull())
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(day('2026-11-12')).not.toBeNull())
  day('2026-11-12')!.focus()
  await nextTick()
  expect(editing()).not.toBeNull()
  expect(onSubmit).not.toHaveBeenCalled()
  day('2026-11-12')!.click()
  await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith('2026-11-12'))

  // Panel open, focus moves on to the page: that is leaving.
  onSubmit.mockClear()
  await vi.waitFor(() => expect(editing()).toBeNull())
  preview(screen.container)!.click()
  await vi.waitFor(() => expect(editing()).not.toBeNull())
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(day('2026-11-20')).not.toBeNull())
  day('2026-11-20')!.focus()
  await nextTick()
  screen.container.querySelector<HTMLButtonElement>('.elsewhere')!.focus()
  await vi.waitFor(() => expect(editing()).toBeNull())
  expect(onSubmit).toHaveBeenCalledWith('2026-11-12')

  // Safari: pressing a panel button drops focus to nowhere. Still inside; a press outside leaves.
  onSubmit.mockClear()
  preview(screen.container)!.click()
  await vi.waitFor(() => expect(editing()).not.toBeNull())
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(day('2026-11-20')).not.toBeNull())
  day('2026-11-20')!.focus()
  const press = (el: Element) =>
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
  press(document.querySelector('.ui-date-picker-panel button')!)
  ;(document.activeElement as HTMLElement).blur()
  await nextTick()
  expect(editing()).not.toBeNull()
  press(screen.container.querySelector('.elsewhere')!)
  await vi.waitFor(() => expect(editing()).toBeNull())
  expect(onSubmit).toHaveBeenCalledWith('2026-11-12')
})
