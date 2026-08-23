import '../src/style.css'
import { h, ref } from 'vue'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import Rating from '../src/components/Rating/Rating.vue'

const pointerId = 1
function pointerdown(el: Element, clientX: number) {
  el.dispatchEvent(
    new PointerEvent('pointerdown', { clientX, clientY: 0, pointerId, bubbles: true }),
  )
}
function pointerup(clientX: number) {
  window.dispatchEvent(
    new PointerEvent('pointerup', { clientX, clientY: 0, pointerId, bubbles: true }),
  )
}

function renderModel(props: Record<string, unknown> = {}) {
  const modelValue = ref((props.modelValue as number) ?? 0)
  const Wrapper = {
    render: () =>
      h(Rating as any, {
        ...props,
        modelValue: modelValue.value,
        'onUpdate:modelValue': (v: number) => (modelValue.value = v),
      }),
  }
  return { screen: render(Wrapper), modelValue }
}

test('clicking a star position commits that value', async () => {
  const { screen, modelValue } = renderModel({ max: 5 })
  const root = screen.container.querySelector('.ui-rating')!
  const rect = root.getBoundingClientRect()

  pointerdown(root, rect.left + rect.width * 0.5)
  pointerup(rect.left + rect.width * 0.5)

  expect(modelValue.value).toBeGreaterThanOrEqual(2)
  expect(modelValue.value).toBeLessThanOrEqual(3)
})

test('allowHalf snaps to the nearest 0.5', async () => {
  const { screen, modelValue } = renderModel({ max: 5, allowHalf: true })
  const root = screen.container.querySelector('.ui-rating')!
  const rect = root.getBoundingClientRect()

  // Just past the 2nd star's left edge — half of star 3, i.e. 2.5.
  pointerdown(root, rect.left + (rect.width / 5) * 2.1)
  pointerup(rect.left + (rect.width / 5) * 2.1)

  expect(modelValue.value).toBe(2.5)
})

test('keyboard: arrows step by 1 (default), Home/End jump to bounds', async () => {
  const { screen, modelValue } = renderModel({ max: 5, modelValue: 2 })
  const root = screen.container.querySelector<HTMLElement>('.ui-rating')!
  root.focus()

  await userEvent.keyboard('{ArrowRight}')
  expect(modelValue.value).toBe(3)

  await userEvent.keyboard('{ArrowLeft}')
  expect(modelValue.value).toBe(2)

  await userEvent.keyboard('{Home}')
  expect(modelValue.value).toBe(0)

  await userEvent.keyboard('{End}')
  expect(modelValue.value).toBe(5)
})

test('keyboard arrows step by 0.5 when allowHalf is set', async () => {
  const { screen, modelValue } = renderModel({ max: 5, allowHalf: true, modelValue: 2 })
  const root = screen.container.querySelector<HTMLElement>('.ui-rating')!
  root.focus()

  await userEvent.keyboard('{ArrowRight}')
  expect(modelValue.value).toBe(2.5)
})

test('readonly ignores pointer and keyboard interaction', async () => {
  const { screen, modelValue } = renderModel({ max: 5, modelValue: 3, readonly: true })
  const root = screen.container.querySelector<HTMLElement>('.ui-rating')!
  const rect = root.getBoundingClientRect()

  pointerdown(root, rect.left + rect.width)
  pointerup(rect.left + rect.width)
  root.focus()
  await userEvent.keyboard('{ArrowRight}')

  expect(modelValue.value).toBe(3)
})

test('disabled has tabindex -1 and ignores interaction', async () => {
  const { screen, modelValue } = renderModel({ max: 5, modelValue: 1, disabled: true })
  const root = screen.container.querySelector<HTMLElement>('.ui-rating')!
  expect(root.getAttribute('tabindex')).toBe('-1')

  const rect = root.getBoundingClientRect()
  pointerdown(root, rect.left + rect.width)
  pointerup(rect.left + rect.width)
  expect(modelValue.value).toBe(1)
})

test('aria-valuenow/valuemax/valuetext reflect the value', async () => {
  const { screen } = renderModel({ max: 5, modelValue: 3 })
  const root = screen.container.querySelector<HTMLElement>('.ui-rating')!
  expect(root.getAttribute('aria-valuenow')).toBe('3')
  expect(root.getAttribute('aria-valuemax')).toBe('5')
  expect(root.getAttribute('aria-valuetext')).toBe('3 of 5')
})

test('custom valueText overrides the default aria-valuetext', async () => {
  const { screen } = renderModel({ max: 5, modelValue: 3, valueText: (v: number) => `${v} stars` })
  const root = screen.container.querySelector<HTMLElement>('.ui-rating')!
  expect(root.getAttribute('aria-valuetext')).toBe('3 stars')
})

test('form participation: hidden input carries the value under name', async () => {
  const modelValue = ref(4)
  const Wrapper = {
    render: () =>
      h('form', { 'data-testid': 'form' }, [
        h(Rating as any, {
          name: 'stars',
          modelValue: modelValue.value,
          'onUpdate:modelValue': (v: number) => (modelValue.value = v),
        }),
      ]),
  }
  const screen = render(Wrapper)
  const form = screen.container.querySelector<HTMLFormElement>('[data-testid="form"]')!
  const data = new FormData(form)
  expect(data.get('stars')).toBe('4')
})

test('the 3rd star is fully filled and the 4th is empty at value 3', async () => {
  const { screen } = renderModel({ max: 5, modelValue: 3 })
  const items = screen.container.querySelectorAll<HTMLElement>('.ui-rating-item')
  expect(items[2]!.style.getPropertyValue('--ui-rating-fill')).toBe('100%')
  expect(items[3]!.style.getPropertyValue('--ui-rating-fill')).toBe('0%')
})
