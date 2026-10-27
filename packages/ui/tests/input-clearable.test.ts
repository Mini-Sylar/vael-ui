import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, ref } from 'vue'
import Input from '../src/components/Input/Input.vue'

function clearableInput(initial: string, props: Record<string, unknown> = {}) {
  const model = ref(initial)
  const onClear = vi.fn()
  const Wrapper = defineComponent({
    setup: () => () =>
      h(Input, {
        clearable: true,
        'aria-label': 'Search',
        ...props,
        modelValue: model.value,
        'onUpdate:modelValue': (value: string) => (model.value = value),
        onClear,
      }),
  })
  return { Wrapper, model, onClear }
}

test('clearable: a clear button shows while there is text, named from input.clear', async () => {
  const { Wrapper, model } = clearableInput('')
  const screen = await render(Wrapper)
  const clear = () => screen.container.querySelector<HTMLButtonElement>('.ui-input-clear')
  expect(clear()).toBeNull()
  model.value = 'milk'
  await nextTick()
  expect(clear()!.getAttribute('aria-label')).toBe('Clear')
  expect(clear()!.type).toBe('button')
})

test('clearable: pressing clear empties the input, emits clear and keeps focus in the input', async () => {
  const { Wrapper, model, onClear } = clearableInput('milk')
  const screen = await render(Wrapper)
  const input = screen.container.querySelector<HTMLInputElement>('input')!
  input.focus()
  await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
  expect(model.value).toBe('')
  expect(onClear).toHaveBeenCalledTimes(1)
  expect(document.activeElement).toBe(input)
})

test('clearable: from the keyboard, focus goes back to the input', async () => {
  const { Wrapper, model } = clearableInput('milk')
  const screen = await render(Wrapper)
  const input = screen.container.querySelector<HTMLInputElement>('input')!
  input.focus()
  await userEvent.keyboard('{Tab}')
  expect(document.activeElement).toBe(screen.container.querySelector('.ui-input-clear'))
  await userEvent.keyboard('{Enter}')
  expect(model.value).toBe('')
  await vi.waitFor(() => expect(document.activeElement).toBe(input))
})

test('clearable: no clear button while disabled or read-only', async () => {
  const off = await render(clearableInput('milk', { disabled: true }).Wrapper)
  expect(off.container.querySelector('.ui-input-clear')).toBeNull()
  const readonly = await render(clearableInput('milk', { readonly: true }).Wrapper)
  expect(readonly.container.querySelector('.ui-input-clear')).toBeNull()
})
