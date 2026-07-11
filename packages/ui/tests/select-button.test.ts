import '../src/style.css'
import { h, nextTick } from 'vue'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import SelectButtonFixture from './fixtures/SelectButtonFixture.vue'
import Field from '../src/components/Field.vue'
import SelectButton from '../src/components/SelectButton.vue'

test('single select via click', async () => {
  const screen = render(SelectButtonFixture, {})
  const grid = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="single"] input[value="grid"]',
  )!
  await userEvent.click(grid)
  await expect.element(screen.getByTestId('single-value')).toHaveTextContent('grid')
})

test('arrow keys move selection and skip the disabled option, wrapping', async () => {
  const screen = render(SelectButtonFixture, {})
  const list = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="single"] input[value="list"]',
  )!
  // Click first so focus and checked state agree (list starts pre-checked by
  // the fixture already, but a real click keeps the premise unambiguous).
  await userEvent.click(list)

  await userEvent.keyboard('{ArrowRight}')
  await expect.element(screen.getByTestId('single-value')).toHaveTextContent('grid')

  // "board" is disabled — native roving skips it and wraps back to "list".
  await userEvent.keyboard('{ArrowRight}')
  await expect.element(screen.getByTestId('single-value')).toHaveTextContent('list')
})

test('allowEmpty clears the model on re-clicking the active option', async () => {
  const screen = render(SelectButtonFixture, {})
  const list = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="single"] input[value="list"]',
  )!
  await userEvent.click(list)
  await expect.element(screen.getByTestId('single-value')).toHaveTextContent('null')
})

test('allowEmpty=false keeps the active option selected on re-click', async () => {
  const screen = render(SelectButtonFixture, { props: { allowEmpty: false } })
  const list = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="single"] input[value="list"]',
  )!
  await userEvent.click(list)
  await expect.element(screen.getByTestId('single-value')).toHaveTextContent('list')
})

test('multiple mode toggles options independently', async () => {
  const screen = render(SelectButtonFixture, {})
  const listInput = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="multi"] input[value="list"]',
  )!
  const gridInput = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="multi"] input[value="grid"]',
  )!
  await userEvent.click(listInput)
  await expect.element(screen.getByTestId('multi-value')).toHaveTextContent('["list"]')
  await userEvent.click(gridInput)
  await expect.element(screen.getByTestId('multi-value')).toHaveTextContent('["list","grid"]')
  await userEvent.click(listInput)
  await expect.element(screen.getByTestId('multi-value')).toHaveTextContent('["grid"]')
})

test('disabled option cannot be selected', async () => {
  const screen = render(SelectButtonFixture, {})
  const board = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="single"] input[value="board"]',
  )!
  expect(board.disabled).toBe(true)
})

test('indicator lands on the checked option and is suppressed on first mount', async () => {
  const screen = render(SelectButton, {
    props: {
      items: [
        { label: 'List', value: 'list' },
        { label: 'Grid', value: 'grid' },
      ],
      modelValue: 'grid',
    },
  })
  await nextTick()
  const indicator = screen.container.querySelector<HTMLElement>('.ui-select-button-indicator')!
  // Real insetInlineStart/inlineSize (useTabIndicator's sizing: 'bounds'),
  // not translate/scale — SelectButton needs an actual layout width for its
  // border-radius to render correctly on the scaled axis (see
  // useTabIndicator.ts's own doc on the option).
  expect(indicator.style.insetInlineStart).not.toBe('')
  expect(indicator.style.inlineSize).not.toBe('')
  expect(indicator.style.transitionDuration).toBe('0ms')
})

test('FormData carries selections for single and multiple modes', async () => {
  const screen = render(SelectButtonFixture, {})
  const form = screen.container.querySelector<HTMLFormElement>('[data-testid="form"]')!
  const data = new FormData(form)
  expect(data.get('single-choice')).toBe('list')
  expect(data.getAll('multi-choice')).toEqual(['list', 'grid'])
})

test('Field label wires aria-labelledby on the group, and Field disabled disables every option', async () => {
  const screen = render(Field, {
    props: { label: 'View', disabled: true },
    slots: {
      default: () =>
        h(SelectButton, {
          modelValue: null,
          items: [
            { label: 'List', value: 'list' },
            { label: 'Grid', value: 'grid' },
          ],
        }),
    },
  })
  const group = screen.container.querySelector('.ui-select-button')!
  const label = screen.container.querySelector('.ui-field-label')!
  expect(group.getAttribute('role')).toBe('radiogroup')
  expect(group.getAttribute('aria-labelledby')).toBe(label.id)
  expect(group.getAttribute('data-invalid')).toBeNull()
  for (const input of screen.container.querySelectorAll<HTMLInputElement>(
    '.ui-select-button-input',
  )) {
    expect(input.disabled).toBe(true)
  }
})

test('Field error flips data-invalid on the group', async () => {
  const screen = render(Field, {
    props: { label: 'View', error: 'Required' },
    slots: {
      default: () =>
        h(SelectButton, {
          modelValue: null,
          items: [{ label: 'List', value: 'list' }],
        }),
    },
  })
  const group = screen.container.querySelector('.ui-select-button')!
  expect(group.hasAttribute('data-invalid')).toBe(true)
})

test('multiple mode gets role="group", not role="radiogroup"', async () => {
  const screen = render(SelectButton, {
    props: {
      multiple: true,
      modelValue: [],
      items: [{ label: 'List', value: 'list' }],
    },
  })
  expect(screen.container.querySelector('.ui-select-button')!.getAttribute('role')).toBe('group')
})
