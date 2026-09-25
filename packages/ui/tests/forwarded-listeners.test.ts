import '../src/style.css'
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, ref } from 'vue'
import Input from '../src/components/Input/Input.vue'

test('a consumer @input that throws still lets Input update, and reaches app.config.errorHandler', async () => {
  const errors: unknown[] = []
  const value = ref('')
  const Host = defineComponent({
    setup: () => () =>
      h(Input, {
        modelValue: value.value,
        'onUpdate:modelValue': (v: string) => (value.value = v),
        onInput: () => {
          throw new Error('consumer boom')
        },
      }),
  })
  const screen = await render(Host, {
    global: { config: { errorHandler: (err: unknown) => void errors.push(err) } },
  })
  await userEvent.type(screen.container.querySelector('input')!, 'ab')
  expect(value.value).toBe('ab')
  expect(errors).toHaveLength(2)
  expect((errors[0] as Error).message).toBe('consumer boom')
})

test('consumer handlers run after the component has applied the change', async () => {
  const seen: string[] = []
  const value = ref('')
  const Host = defineComponent({
    setup: () => () =>
      h(Input, {
        modelValue: value.value,
        'onUpdate:modelValue': (v: string) => (value.value = v),
        onInput: () => seen.push(value.value),
      }),
  })
  const screen = await render(Host)
  await userEvent.type(screen.container.querySelector('input')!, 'xy')
  expect(seen).toEqual(['x', 'xy'])
})
