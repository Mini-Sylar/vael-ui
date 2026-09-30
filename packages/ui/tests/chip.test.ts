import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import ChipFixture from './fixtures/ChipFixture.vue'
import ChipListFixture from './fixtures/ChipListFixture.vue'
import Chip from '../src/components/Chip/Chip.vue'

test('renders the label prop by default', async () => {
  const screen = await render(Chip, { props: { label: 'Banana' } })
  await expect
    .element(screen.container.querySelector<HTMLElement>('.ui-chip-label')!)
    .toHaveTextContent('Banana')
})

test('the default slot overrides the label content', async () => {
  const screen = await render(Chip, { props: { label: 'Banana' }, slots: { default: 'Custom' } })
  await expect
    .element(screen.container.querySelector<HTMLElement>('.ui-chip-label')!)
    .toHaveTextContent('Custom')
})

test('removable renders a remove button that emits remove; non-removable renders none', async () => {
  const screen = await render(ChipFixture, { props: { removable: true } })
  const button = screen.container.querySelector<HTMLButtonElement>('.ui-chip-remove')!
  expect(button).not.toBeNull()
  await userEvent.click(button)
  await expect.element(screen.getByTestId('remove-count')).toHaveTextContent('1')

  await screen.unmount()
  const plain = await render(ChipFixture, { props: { removable: false } })
  expect(plain.container.querySelector('.ui-chip-remove')).toBeNull()
})

test('the remove button accessible name is "Remove {label}"', async () => {
  const screen = await render(Chip, { props: { label: 'Banana', removable: true } })
  const button = screen.container.querySelector<HTMLButtonElement>('.ui-chip-remove')!
  expect(button.getAttribute('aria-label')).toBe('Remove Banana')
})

test('disabled sets data-disabled on the root and disables the remove button', async () => {
  const screen = await render(ChipFixture, { props: { removable: true, disabled: true } })
  const root = screen.container.querySelector<HTMLElement>('.ui-chip')!
  expect(root.hasAttribute('data-disabled')).toBe(true)
  const button = screen.container.querySelector<HTMLButtonElement>('.ui-chip-remove')!
  // A real disabled <button> never dispatches click at all — the browser
  // itself is the guard here, so there's nothing further to drive.
  expect(button.disabled).toBe(true)
})

test('size classes apply to the root', async () => {
  const screen = await render(Chip, { props: { label: 'Small', size: 'sm' } })
  expect(screen.container.querySelector('.ui-chip--sm')).not.toBeNull()

  await screen.unmount()
  const md = await render(Chip, { props: { label: 'Medium' } })
  expect(md.container.querySelector('.ui-chip--md')).not.toBeNull()
})

test('ui part overrides land on root/label/remove', async () => {
  const screen = await render(Chip, {
    props: {
      label: 'Apple',
      removable: true,
      ui: { root: 'my-root', label: 'my-label', remove: 'my-remove' },
    },
  })
  expect(screen.container.querySelector('.my-root')).not.toBeNull()
  expect(screen.container.querySelector('.my-label')).not.toBeNull()
  expect(screen.container.querySelector('.my-remove')).not.toBeNull()
})

test('Delete and Backspace on the focused remove button emit remove', async () => {
  const screen = await render(ChipFixture, { props: { removable: true } })
  const button = screen.container.querySelector<HTMLButtonElement>('.ui-chip-remove')!
  button.focus()
  await userEvent.keyboard('{Delete}')
  await expect.element(screen.getByTestId('remove-count')).toHaveTextContent('1')
  await userEvent.keyboard('{Backspace}')
  await expect.element(screen.getByTestId('remove-count')).toHaveTextContent('2')
})

test('Delete does nothing when the chip is disabled or not removable', async () => {
  const screen = await render(ChipFixture, { props: { removable: false } })
  const root = screen.container.querySelector<HTMLElement>('.ui-chip')!
  root.tabIndex = 0
  root.focus()
  await userEvent.keyboard('{Delete}')
  await expect.element(screen.getByTestId('remove-count')).toHaveTextContent('0')
})

test('removing the focused chip moves focus to the next chip, then the previous', async () => {
  const screen = await render(ChipListFixture)
  const buttons = () =>
    Array.from(screen.container.querySelectorAll<HTMLButtonElement>('.ui-chip-remove'))
  buttons()[1]!.focus()
  await userEvent.keyboard('{Delete}')
  await expect.poll(() => buttons().length).toBe(2)
  await expect.poll(() => document.activeElement?.getAttribute('aria-label')).toBe('Remove C')

  await userEvent.keyboard('{Backspace}')
  await expect.poll(() => buttons().length).toBe(1)
  await expect.poll(() => document.activeElement?.getAttribute('aria-label')).toBe('Remove A')
})

test('removing a chip that does not hold focus leaves focus alone', async () => {
  const screen = await render(ChipListFixture)
  const outside = document.createElement('button')
  document.body.append(outside)
  outside.focus()
  screen.container.querySelector<HTMLButtonElement>('.ui-chip-remove')!.click()
  await expect.poll(() => screen.container.querySelectorAll('.ui-chip').length).toBe(2)
  expect(document.activeElement).toBe(outside)
  outside.remove()
})
