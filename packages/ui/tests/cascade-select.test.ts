import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import CascadeSelectFixture from './fixtures/CascadeSelectFixture.vue'

beforeEach(() => {
  // Teleported positioners can outlive a fixture torn down mid-transition —
  // same cleanup as menu.test.ts/menu-submenu.test.ts, since the panel here
  // literally IS a Menu positioner.
  for (const el of document.querySelectorAll('.ui-menu-positioner')) el.remove()
})

function focusedText() {
  return document.activeElement?.textContent?.trim()
}

test('trigger click opens the panel and focuses the first top-level row', async () => {
  const screen = render(CascadeSelectFixture)
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('ArrowRight descends a level at a time; Enter on a leaf commits the value, the full path, and closes the whole chain', async () => {
  const screen = render(CascadeSelectFixture)
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))

  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Ghana'))

  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Accra'))

  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('value')).toHaveTextContent('accra')
  await expect.element(screen.getByTestId('path')).toHaveTextContent('africa>gh>accra')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('ArrowLeft ascends back to the parent row without losing focus context', async () => {
  const screen = render(CascadeSelectFixture)
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))

  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Ghana'))
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))
})

test('a disabled branch is skipped by arrow-key stepping at its own level', async () => {
  const screen = render(CascadeSelectFixture)
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))

  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Ghana'))
  // Nigeria (disabled) is skipped straight past — ArrowDown from Ghana at
  // this level has nowhere else to land since it's the only enabled row.
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('Ghana'))
})

test('clicking a leaf row commits the value and path via mouse, same as keyboard', async () => {
  const screen = render(CascadeSelectFixture)
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))

  await screen.getByRole('menuitem', { name: 'Europe' }).hover()
  await vi.waitFor(
    () => expect(screen.getByRole('menuitem', { name: 'France' }).query()).not.toBeNull(),
    {
      timeout: 1000,
    },
  )
  await screen.getByRole('menuitem', { name: 'France' }).click()
  await vi.waitFor(
    () => expect(screen.getByRole('menuitem', { name: 'Lyon' }).query()).not.toBeNull(),
    {
      timeout: 1000,
    },
  )
  await screen.getByRole('menuitem', { name: 'Lyon' }).click()

  await expect.element(screen.getByTestId('value')).toHaveTextContent('lyon')
  await expect.element(screen.getByTestId('path')).toHaveTextContent('europe>fr>lyon')
})

test('typeahead jumps within a level', async () => {
  const screen = render(CascadeSelectFixture)
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))

  await userEvent.keyboard('e')
  await vi.waitFor(() => expect(focusedText()).toBe('Europe'))
})

test('Escape closes the current level first, then the whole panel on a second press', async () => {
  const screen = render(CascadeSelectFixture)
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Ghana'))

  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(screen.getByRole('menuitem', { name: 'Ghana' }).query()).toBeNull())
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('the disabled prop disables the trigger and blocks opening', async () => {
  const screen = render(CascadeSelectFixture, { props: { disabled: true } })
  const trigger = screen.getByRole('combobox')
  await expect.element(trigger).toHaveAttribute('aria-disabled', 'true')
  await trigger.click({ force: true })
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('clearable shows a clear button once a leaf is selected, and it resets the model without opening the panel', async () => {
  const screen = render(CascadeSelectFixture, { props: { clearable: true } })
  await expect.element(screen.getByLabelText('Clear selection')).not.toBeInTheDocument()

  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Ghana'))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Accra'))
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('value')).toHaveTextContent('accra')

  const clearButton = screen.getByLabelText('Clear selection')
  await expect.element(clearButton).toBeInTheDocument()
  await clearButton.click()

  await expect.element(screen.getByTestId('value')).toHaveTextContent('')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('an empty items array renders the localized empty row instead of a blank panel', async () => {
  const screen = render(CascadeSelectFixture, { props: { items: [] } })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByText('No options')).toBeInTheDocument()
})

test('the `name` prop renders a hidden input mirroring the committed leaf value for form participation', async () => {
  const screen = render(CascadeSelectFixture)
  const hidden = screen.container.querySelector<HTMLInputElement>(
    'input[type="hidden"][name="city"]',
  )!
  expect(hidden.value).toBe('')

  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Ghana'))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Accra'))
  await userEvent.keyboard('{Enter}')

  await vi.waitFor(() => expect(hidden.value).toBe('accra'))
})
