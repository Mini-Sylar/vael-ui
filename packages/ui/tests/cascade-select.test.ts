import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import CascadeSelectFixture from './fixtures/CascadeSelectFixture.vue'
import CascadeSelect from '../src/components/CascadeSelect/CascadeSelect.vue'
import Field from '../src/components/Field/Field.vue'

beforeEach(() => {
  // Teleported positioners can outlive a fixture torn down mid-transition —
  // same cleanup as menu.test.ts/menu-submenu.test.ts, since the panel here
  // literally IS a Menu positioner.
  for (const el of document.querySelectorAll('.ui-menu-positioner')) el.remove()
})

function focusedText() {
  return document.activeElement?.textContent?.trim()
}

test('trigger click opens the panel and focuses the first top-level row; header/footer forward to Menu', async () => {
  const screen = await render(CascadeSelectFixture, {
    props: { withHeader: true, withFooter: true },
  })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  await expect.element(screen.getByTestId('cascade-select-header')).toBeInTheDocument()
  await expect.element(screen.getByTestId('cascade-select-footer')).toBeInTheDocument()
})

test('ArrowRight descends a level at a time; Enter on a leaf commits the value, the full path, and closes the whole chain', async () => {
  const screen = await render(CascadeSelectFixture)
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
  const screen = await render(CascadeSelectFixture)
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))

  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Ghana'))
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))
})

test('a disabled branch is skipped by arrow-key stepping at its own level', async () => {
  const screen = await render(CascadeSelectFixture)
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))

  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Ghana'))
  // Nigeria (disabled) is skipped straight past — ArrowDown from Ghana at
  // this level has nowhere else to land since it's the only enabled row.
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('Ghana'))
})

test('reopening with a value reveals the selected path: submenus open, the selected leaf is focused and tinted', async () => {
  const screen = await render(CascadeSelectFixture)
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Ghana'))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Accra'))
  await userEvent.keyboard('{ArrowDown}{Enter}')
  await expect.element(screen.getByTestId('value')).toHaveTextContent('kumasi')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')

  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Kumasi'))
  const row = (name: string) => screen.getByRole('menuitem', { name }).element()
  expect(row('Africa').getAttribute('aria-expanded')).toBe('true')
  expect(row('Ghana').getAttribute('aria-expanded')).toBe('true')
  expect(row('Europe').getAttribute('aria-expanded')).toBe('false')
  for (const name of ['Africa', 'Ghana', 'Kumasi']) {
    expect(row(name).hasAttribute('data-cascade-selected')).toBe(true)
  }
  expect(row('Accra').hasAttribute('data-cascade-selected')).toBe(false)

  // ArrowLeft still walks back up the revealed path.
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(focusedText()).toBe('Ghana'))
})

test('clicking a leaf row commits the value and path via mouse, same as keyboard', async () => {
  const screen = await render(CascadeSelectFixture)
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
  const screen = await render(CascadeSelectFixture)
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))

  await userEvent.keyboard('e')
  await vi.waitFor(() => expect(focusedText()).toBe('Europe'))
})

test('Escape closes the current level first, then the whole panel on a second press', async () => {
  const screen = await render(CascadeSelectFixture)
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
  const screen = await render(CascadeSelectFixture, { props: { disabled: true } })
  const trigger = screen.getByRole('combobox')
  await expect.element(trigger).toHaveAttribute('aria-disabled', 'true')
  await trigger.click({ force: true })
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('clearable shows a clear button once a leaf is selected, and it resets the model without opening the panel', async () => {
  const screen = await render(CascadeSelectFixture, { props: { clearable: true } })
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
  const screen = await render(CascadeSelectFixture, { props: { items: [] } })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByText('No options')).toBeInTheDocument()
})

test('the `name` prop renders a hidden input mirroring the committed leaf value for form participation', async () => {
  const screen = await render(CascadeSelectFixture)
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

// --- multiple ---

function row(name: string) {
  return [...document.querySelectorAll<HTMLElement>('.ui-menu-positioner [data-menu-index]')].find(
    (el) => el.textContent?.trim() === name,
  )
}

function chipLabels(container: Element) {
  return [...container.querySelectorAll('.ui-chip:not(.ui-cascade-select-chip--overflow)')].map(
    (chip) => chip.textContent?.trim(),
  )
}

test('multiple: Enter/Space on a leaf toggles it into the array, keeps the menu open and focus on that row', async () => {
  const screen = await render(CascadeSelectFixture, { props: { multiple: true } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Ghana'))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Accra'))

  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["accra"]')
  await expect.element(screen.getByTestId('last-change')).toHaveTextContent('["accra"]')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  expect(focusedText()).toBe('Accra')
  expect(row('Accra')!.getAttribute('aria-checked')).toBe('true')

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('Kumasi'))
  await userEvent.keyboard(' ')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["accra","kumasi"]')
  expect(focusedText()).toBe('Kumasi')

  // A second toggle removes it again.
  await userEvent.keyboard('{ArrowUp}{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["kumasi"]')
  expect(row('Accra')!.getAttribute('aria-checked')).toBe('false')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  // Escape still closes, a level at a time.
  await userEvent.keyboard('{Escape}{Escape}')
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('multiple: clicking leaves across branches builds the array; branches stay plain menuitems', async () => {
  const screen = await render(CascadeSelectFixture, { props: { multiple: true } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))

  await screen.getByRole('menuitem', { name: 'Africa' }).click()
  await screen.getByRole('menuitem', { name: 'Ghana' }).click()
  await screen.getByRole('menuitemcheckbox', { name: 'Accra' }).click()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["accra"]')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  // Back out of the submenus, which may cover the root rows in a narrow viewport.
  await userEvent.keyboard('{Escape}{Escape}')
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))
  await screen.getByRole('menuitem', { name: 'Europe' }).click()
  await screen.getByRole('menuitem', { name: 'France' }).click()
  await screen.getByRole('menuitemcheckbox', { name: 'Lyon' }).click()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["accra","lyon"]')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  const lyon = screen.getByRole('menuitemcheckbox', { name: 'Lyon' }).element()
  expect(lyon.getAttribute('aria-checked')).toBe('true')
  expect(lyon.querySelector('.ui-menu-item-check')).not.toBeNull()
  expect(
    screen.getByRole('menuitemcheckbox', { name: 'Paris' }).element().getAttribute('aria-checked'),
  ).toBe('false')
  const europe = screen.getByRole('menuitem', { name: 'Europe' }).element()
  expect(europe.hasAttribute('aria-checked')).toBe(false)
  // Every branch holding a selection keeps the selected tint.
  expect(europe.hasAttribute('data-cascade-selected')).toBe(true)
  expect(
    screen
      .getByRole('menuitem', { name: 'Africa' })
      .element()
      .hasAttribute('data-cascade-selected'),
  ).toBe(true)
})

test('single mode rows stay plain menuitems without aria-checked', async () => {
  const screen = await render(CascadeSelectFixture)
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Africa'))
  await userEvent.keyboard('{ArrowRight}{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Accra'))
  expect(document.querySelector('[role="menuitemcheckbox"]')).toBeNull()
  expect(document.querySelector('.ui-menu-positioner [aria-checked]')).toBeNull()
})

test('multiple: chips follow tree order and the remove button drops just that value', async () => {
  const screen = await render(CascadeSelectFixture, {
    props: { multiple: true, initial: ['lyon', 'accra'] },
  })
  const trigger = screen.getByRole('combobox').element()
  expect(chipLabels(trigger)).toEqual(['Accra', 'Lyon'])
  expect(trigger.querySelector('.ui-cascade-select-chips')).not.toBeNull()
  expect(trigger.hasAttribute('data-placeholder')).toBe(false)

  await screen.getByRole('button', { name: 'Remove Accra' }).click()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["lyon"]')
  await expect.element(screen.getByTestId('last-change')).toHaveTextContent('["lyon"]')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')

  // Removing a chip while the panel is open leaves it open.
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Lyon'))
  await screen.getByRole('button', { name: 'Remove Lyon' }).click()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('[]')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('multiple: clearable empties the whole array', async () => {
  const screen = await render(CascadeSelectFixture, {
    props: { multiple: true, clearable: true, initial: ['accra', 'paris'] },
  })
  await screen.getByLabelText('Clear selection').click()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('[]')
  await expect.element(screen.getByTestId('last-change')).toHaveTextContent('[]')
  await expect.element(screen.getByLabelText('Clear selection')).not.toBeInTheDocument()
  await expect.element(screen.getByRole('combobox')).toHaveTextContent('Pick a city')
})

test('multiple: maxLabels collapses extra chips into "+N"', async () => {
  const screen = await render(CascadeSelectFixture, {
    props: { multiple: true, maxLabels: 1, initial: ['accra', 'kumasi', 'paris'] },
  })
  const trigger = screen.getByRole('combobox').element()
  expect(chipLabels(trigger)).toEqual(['Accra'])
  expect(trigger.querySelector('.ui-cascade-select-chip--overflow')?.textContent?.trim()).toBe('+2')
})

test('multiple: display="text" joins labels and display="count" shows the localized count', async () => {
  const text = await render(CascadeSelectFixture, {
    props: { multiple: true, display: 'text', initial: ['accra', 'paris'] },
  })
  expect(text.container.querySelector('.ui-chip')).toBeNull()
  await expect.element(text.getByRole('combobox')).toHaveTextContent('Accra, Paris')
  await text.unmount()

  const count = await render(CascadeSelectFixture, {
    props: { multiple: true, display: 'count', initial: ['accra', 'paris'] },
  })
  expect(count.container.querySelector('.ui-chip')).toBeNull()
  await expect.element(count.getByRole('combobox')).toHaveTextContent('2 selected')
})

test('multiple: the name prop renders one hidden input per selected value', async () => {
  const screen = await render(CascadeSelectFixture, {
    props: { multiple: true, initial: ['accra', 'paris'] },
  })
  const values = () =>
    [
      ...screen.container.querySelectorAll<HTMLInputElement>('input[type="hidden"][name="city"]'),
    ].map((input) => input.value)
  expect(values()).toEqual(['accra', 'paris'])
  await screen.getByRole('button', { name: 'Remove Accra' }).click()
  await vi.waitFor(() => expect(values()).toEqual(['paris']))
})

test('multiple: the #value slot receives the selected items and their paths', async () => {
  const screen = await render({
    components: { CascadeSelect },
    data: () => ({
      model: ['lyon', 'accra'],
      tree: [
        { label: 'Ghana', value: 'gh', children: [{ label: 'Accra', value: 'accra' }] },
        { label: 'France', value: 'fr', children: [{ label: 'Lyon', value: 'lyon' }] },
      ],
    }),
    template: `<CascadeSelect v-model="model" multiple :items="tree">
      <template #value="{ selected, path }">
        <span data-testid="slot">{{ selected.map((s) => s.label).join('|') }} {{ path.map((p) => p.join('>')).join('|') }}</span>
      </template>
    </CascadeSelect>`,
  })
  await expect.element(screen.getByTestId('slot')).toHaveTextContent('Accra|Lyon gh>accra|fr>lyon')
})

test('multiple: a Field label still names the combobox', async () => {
  const screen = await render({
    components: { CascadeSelect, Field },
    data: () => ({
      model: ['leaf'],
      tree: [{ label: 'Root', value: 'root', children: [{ label: 'Leaf', value: 'leaf' }] }],
    }),
    template: `<Field label="Cities"><CascadeSelect v-model="model" multiple :items="tree" /></Field>`,
  })
  await expect.element(screen.getByRole('combobox', { name: 'Cities' })).toBeInTheDocument()
})

test('multiple: Enter on a chip remove button removes it without opening the panel', async () => {
  const screen = await render(CascadeSelectFixture, {
    props: { multiple: true, initial: ['accra', 'paris'] },
  })
  const remove = screen.getByRole('button', { name: 'Remove Accra' }).element() as HTMLElement
  remove.focus()
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["paris"]')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')

  // Enter on the trigger itself still opens it.
  ;(screen.getByRole('combobox').element() as HTMLElement).focus()
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('multiple: motionCss=false turns off the built-in chip transition', async () => {
  const screen = await render(CascadeSelect, {
    props: {
      items: [{ label: 'Ghana', value: 'gh', children: [{ label: 'Accra', value: 'accra' }] }],
      multiple: true,
      modelValue: ['accra'],
      motionCss: false,
    },
  })
  const chips = screen.container.querySelector('.ui-cascade-select-chips')!
  expect(chips.getAttribute('data-motion')).toBe('off')
})

test('the combobox carries the popup state, not a chip remove button inside it', async () => {
  const screen = await render({
    components: { CascadeSelect, Field },
    data: () => ({
      model: ['leaf'],
      tree: [{ label: 'Root', value: 'root', children: [{ label: 'Leaf', value: 'leaf' }] }],
    }),
    template: `<Field label="Cities"><CascadeSelect v-model="model" multiple :items="tree" /></Field>`,
  })
  const combobox = screen.getByRole('combobox', { name: 'Cities' })
  await expect.element(combobox).toHaveAttribute('aria-haspopup', 'menu')
  await expect.element(combobox).toHaveAttribute('aria-expanded', 'false')
  expect(document.querySelector('.ui-chip-remove')?.hasAttribute('aria-haspopup')).toBe(false)

  await combobox.click()
  await expect.element(combobox).toHaveAttribute('aria-expanded', 'true')
  const menu = document.querySelector('[role="menu"]')!
  expect(menu.id).not.toBe('')
  await expect.element(combobox).toHaveAttribute('aria-controls', menu.id)
})
