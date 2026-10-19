import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import Button from '../src/components/Button/Button.vue'
import ButtonGroup from '../src/components/ButtonGroup/ButtonGroup.vue'

const pressedOf = (name: string) =>
  page.getByRole('button', { name }).element().getAttribute('aria-pressed')

function renderGroup(groupProps: Record<string, unknown>, initial: unknown, extra?: () => unknown) {
  const model = shallowRef(initial)
  render(() =>
    h(
      ButtonGroup as never,
      {
        ariaLabel: 'Group',
        modelValue: model.value,
        'onUpdate:modelValue': (v: unknown) => (model.value = v),
        ...groupProps,
      },
      () => [
        h(Button, { value: 'bold', 'aria-label': 'Bold' }, () => 'B'),
        h(Button, { value: 'italic', 'aria-label': 'Italic' }, () => 'I'),
        extra?.(),
      ],
    ),
  )
  return model
}

test('multiple: each button turns on and off, the model is an array, aria-pressed follows', async () => {
  const model = renderGroup({ multiple: true }, ['bold'])
  expect(pressedOf('Bold')).toBe('true')
  expect(pressedOf('Italic')).toBe('false')
  await page.getByRole('button', { name: 'Italic' }).click()
  await vi.waitFor(() => expect(model.value).toEqual(['bold', 'italic']))
  await page.getByRole('button', { name: 'Bold' }).click()
  await vi.waitFor(() => expect(model.value).toEqual(['italic']))
  expect(pressedOf('Bold')).toBe('false')
})

test('one at a time: picking another moves it; allowEmpty decides whether the on one turns off', async () => {
  const model = renderGroup({}, 'bold')
  await page.getByRole('button', { name: 'Italic' }).click()
  await vi.waitFor(() => expect(model.value).toBe('italic'))
  await page.getByRole('button', { name: 'Italic' }).click()
  await vi.waitFor(() => expect(model.value).toBeNull())
})

test('allowEmpty false keeps one on', async () => {
  const model = renderGroup({ allowEmpty: false }, 'bold')
  await page.getByRole('button', { name: 'Bold' }).click()
  await new Promise((r) => setTimeout(r, 50))
  expect(model.value).toBe('bold')
  expect(pressedOf('Bold')).toBe('true')
})

test('a button without a value stays an ordinary action in a toggling group', async () => {
  const clicks = vi.fn()
  renderGroup({ multiple: true }, [], () =>
    h(Button, { 'aria-label': 'Clear', onClick: clicks }, () => 'Clear'),
  )
  expect(pressedOf('Clear')).toBeNull()
  await page.getByRole('button', { name: 'Clear' }).click()
  expect(clicks).toHaveBeenCalledOnce()
  expect(pressedOf('Clear')).toBeNull()
})

test('your @click runs first, and preventDefault() keeps the toggle where it was', async () => {
  const seen: unknown[] = []
  const model = shallowRef<string[]>([])
  render(() =>
    h(
      ButtonGroup as never,
      {
        multiple: true,
        modelValue: model.value,
        'onUpdate:modelValue': (v: string[]) => (model.value = v),
      },
      () => [
        h(
          Button,
          { value: 'bold', 'aria-label': 'Bold', onClick: () => seen.push([...model.value]) },
          () => 'B',
        ),
        h(
          Button,
          { value: 'lock', 'aria-label': 'Lock', onClick: (e: MouseEvent) => e.preventDefault() },
          () => 'L',
        ),
      ],
    ),
  )
  await page.getByRole('button', { name: 'Bold' }).click()
  await vi.waitFor(() => expect(model.value).toEqual(['bold']))
  expect(seen).toEqual([[]]) // the handler saw the state before the toggle
  await page.getByRole('button', { name: 'Lock' }).click()
  await new Promise((r) => setTimeout(r, 50))
  expect(model.value).toEqual(['bold'])
})

test('without v-model the group is purely visual and a hand-written aria-pressed is kept', async () => {
  render(() =>
    h(ButtonGroup as never, null, () => [
      h(Button, { value: 'bold', 'aria-label': 'Bold', 'aria-pressed': 'true' }, () => 'B'),
      h(Button, { value: 'italic', 'aria-label': 'Italic' }, () => 'I'),
    ]),
  )
  expect(pressedOf('Bold')).toBe('true')
  expect(pressedOf('Italic')).toBeNull()
  await page.getByRole('button', { name: 'Italic' }).click()
  expect(pressedOf('Italic')).toBeNull()
})

test('a standalone Button toggles with v-model:pressed', async () => {
  const muted = shallowRef(false)
  render(() =>
    h(
      Button as never,
      {
        'aria-label': 'Mute',
        pressed: muted.value,
        'onUpdate:pressed': (v: boolean) => (muted.value = v),
      },
      () => 'M',
    ),
  )
  expect(pressedOf('Mute')).toBe('false')
  await page.getByRole('button', { name: 'Mute' }).click()
  await vi.waitFor(() => expect(muted.value).toBe(true))
  expect(pressedOf('Mute')).toBe('true')
})

test('value is still the native attribute, so a submit button posts it', async () => {
  let posted = ''
  render(() =>
    h(
      'form',
      {
        onSubmit: (e: SubmitEvent) => {
          e.preventDefault()
          posted = String(new FormData(e.target as HTMLFormElement, e.submitter).get('action'))
        },
      },
      [h(Button, { type: 'submit', name: 'action', value: 'archive' }, () => 'Archive')],
    ),
  )
  await userEvent.click(page.getByRole('button', { name: 'Archive' }))
  await vi.waitFor(() => expect(posted).toBe('archive'))
})
