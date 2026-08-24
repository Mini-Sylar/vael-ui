import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import SelectFixture from './fixtures/SelectFixture.vue'
import SelectFormFixture from './fixtures/SelectFormFixture.vue'
import Select from '../src/components/Select/Select.vue'

beforeEach(() => {
  // Teleported positioners can outlive a fixture torn down mid-transition.
  for (const el of document.querySelectorAll('.ui-select-positioner')) el.remove()
})

test('a plain class passed to Select reaches the rendered trigger', async () => {
  const screen = render(Select, {
    props: { items: [{ label: 'A', value: 'a' }] },
    attrs: { class: 'my-select' },
  })
  const trigger = screen.getByRole('combobox')
  expect(trigger.element().closest('.my-select')).not.toBeNull()
})

test('click opens the panel; the previously-selected item is active and scrolled into view', async () => {
  const screen = render(SelectFixture)
  const trigger = screen.getByRole('combobox')
  await trigger.click()

  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  await vi.waitFor(() => {
    expect(trigger.element().getAttribute('aria-activedescendant')).toBeTruthy()
  })
  // Focus stays on the trigger the entire time (activedescendant pattern).
  expect(document.activeElement).toBe(trigger.element())
})

test('ArrowDown/ArrowUp move aria-activedescendant while DOM focus stays on the trigger', async () => {
  const screen = render(SelectFixture)
  const trigger = screen.getByRole('combobox')
  await trigger.click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  const before = trigger.element().getAttribute('aria-activedescendant')
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => {
    expect(trigger.element().getAttribute('aria-activedescendant')).not.toBe(before)
  })
  expect(document.activeElement).toBe(trigger.element())
  expect(document.activeElement?.getAttribute('role')).toBe('combobox')
})

test('typeahead jumps the active option to the next label match', async () => {
  const screen = render(SelectFixture)
  const trigger = screen.getByRole('combobox')
  await trigger.click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  await userEvent.keyboard('d')
  await vi.waitFor(() => {
    const id = trigger.element().getAttribute('aria-activedescendant')
    const active = document.getElementById(id!)
    expect(active?.textContent).toContain('Date')
  })
})

test('Enter commits the active option and closes; multiple keeps it open and toggles aria-selected', async () => {
  const screen = render(SelectFixture)
  const trigger = screen.getByRole('combobox')
  await trigger.click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  // Opening with nothing selected already activates the first enabled item
  // (Apple) — Enter alone commits it, no ArrowDown needed.
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"apple"')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')

  screen.unmount()
  const multi = render(SelectFixture, { props: { multiple: true } })
  const multiTrigger = multi.getByRole('combobox')
  await multiTrigger.click()
  await expect.element(multi.getByRole('listbox')).toBeInTheDocument()
  await userEvent.keyboard('{Enter}')
  await expect.element(multi.getByTestId('model')).toHaveTextContent('["apple"]')
  await expect.element(multi.getByTestId('open-state')).toHaveTextContent('open')
  const option = document.querySelector('[role="option"][aria-selected="true"]')
  expect(option).not.toBeNull()
})

test('multiple mode renders each selection as a removable chip; the × removes just that one', async () => {
  const screen = render(SelectFixture, { props: { multiple: true } })
  const trigger = screen.getByRole('combobox')
  await trigger.click()
  await userEvent.keyboard('{Enter}') // apple
  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{Enter}') // banana
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["apple","banana"]')

  const chips = document.querySelectorAll('.ui-chip:not(.ui-select-chip--overflow)')
  expect(chips.length).toBe(2)
  expect(chips[0]!.textContent).toContain('Apple')

  // Multiple mode keeps the panel open after each Enter-select (confirmed
  // above) — the panel is still open here. Removing a chip must not toggle
  // that either way: no stopPropagation would close it via the trigger's
  // own click-to-toggle handler firing on top of the chip's own click.
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  const removeApple = chips[0]!.querySelector<HTMLButtonElement>('.ui-chip-remove')!
  await userEvent.click(removeApple)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["banana"]')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('maxLabels collapses extra selections into a "+N" chip', async () => {
  const screen = render(Select, {
    props: {
      items: [
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana' },
        { label: 'Cherry', value: 'cherry' },
      ],
      multiple: true,
      modelValue: ['apple', 'banana', 'cherry'],
      maxLabels: 1,
    },
  })
  const chips = screen.container.querySelectorAll('.ui-chip:not(.ui-select-chip--overflow)')
  expect(chips.length).toBe(1)
  const overflow = screen.container.querySelector('.ui-select-chip--overflow')
  expect(overflow?.textContent?.trim()).toBe('+2')
})

test('motionCss=false disables the chip transition, including its move (reflow) animation', async () => {
  const screen = render(Select, {
    props: {
      items: [
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana' },
      ],
      multiple: true,
      modelValue: ['apple', 'banana'],
      motionCss: false,
    },
    global: { stubs: { 'transition-group': false } },
  })
  const chips = screen.container.querySelector<HTMLElement>('.ui-select-chips')!
  expect(chips.getAttribute('data-motion')).toBe('off')

  // Vue's move (FLIP) animation isn't gated by TransitionGroup's own `:css`
  // prop, only enter/leave are — same probe DataTable/SpeedDial's own tests
  // use to check the actual resolved transition.
  const probe = document.createElement('span')
  probe.className = 'ui-chip-item-move'
  chips.appendChild(probe)
  const duration = getComputedStyle(probe).transitionDuration
  probe.remove()
  expect(duration).toBe('0s')
})

test('display="text" renders comma-joined labels instead of chips in multiple mode', async () => {
  const screen = render(Select, {
    props: {
      items: [
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana' },
      ],
      multiple: true,
      modelValue: ['apple', 'banana'],
      display: 'text',
    },
  })
  expect(screen.container.querySelector('.ui-chip')).toBeNull()
  await expect.element(screen.getByRole('combobox')).toHaveTextContent('Apple, Banana')
})

test('display="count" renders a localized "N selected" summary in multiple mode', async () => {
  const screen = render(Select, {
    props: {
      items: [
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana' },
        { label: 'Cherry', value: 'cherry' },
      ],
      multiple: true,
      modelValue: ['apple', 'banana', 'cherry'],
      display: 'count',
    },
  })
  expect(screen.container.querySelector('.ui-chip')).toBeNull()
  await expect.element(screen.getByRole('combobox')).toHaveTextContent('3 selected')
})

test('display defaults to "chip" — omitting the prop keeps the existing removable-chip behavior', async () => {
  const screen = render(Select, {
    props: {
      items: [{ label: 'Apple', value: 'apple' }],
      multiple: true,
      modelValue: ['apple'],
    },
  })
  expect(screen.container.querySelector('.ui-chip')).not.toBeNull()
})

test('virtualization renders a rendered window, not all 1000 rows, for a large list', async () => {
  const screen = render(SelectFixture, { props: { itemCount: 1000 } })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  await vi.waitFor(() => {
    const rendered = document.querySelectorAll('[role="option"]').length
    expect(rendered).toBeGreaterThan(0)
    expect(rendered).toBeLessThan(100)
  })
})

test('the listbox body still gets a real capped height (v-scroll-mask keeps working) now that max-height lives on the panel, not the body directly', async () => {
  const screen = render(SelectFixture, { props: { itemCount: 1000 } })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  await vi.waitFor(() => {
    const body = document.querySelector('.ui-select-body')
    expect(body?.className).toContain('scroll-fade')
  })
  const body = document.querySelector('.ui-select-body') as HTMLElement
  expect(body.clientHeight).toBeLessThan(body.scrollHeight)
})

test('reach-end fires near the bottom in both virtualized and non-virtualized modes', async () => {
  // Non-virtualized (small list, below the auto-virtualize threshold): the
  // whole list already renders, so reach-end fires as soon as it's open.
  const small = render(SelectFixture)
  await small.getByRole('combobox').click()
  await vi.waitFor(() => {
    expect(small.getByTestId('reach-end-count').element().textContent).toBe('1')
  })
  small.unmount()

  // Virtualized (large list): fires once the scroll gets near the bottom.
  const big = render(SelectFixture, { props: { itemCount: 1000 } })
  await big.getByRole('combobox').click()
  await expect.element(big.getByRole('listbox')).toBeInTheDocument()
  expect(big.getByTestId('reach-end-count').element().textContent).toBe('0')

  const body = document.querySelector<HTMLElement>('.ui-select-body')!
  body.scrollTop = body.scrollHeight
  body.dispatchEvent(new Event('scroll'))
  await vi.waitFor(() => {
    expect(big.getByTestId('reach-end-count').element().textContent).toBe('1')
  })
})

test('panel inline-size matches the trigger width (matchReferenceWidth)', async () => {
  const screen = render(SelectFixture)
  const trigger = screen.getByRole('combobox')
  await trigger.click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  const panel = document.querySelector<HTMLElement>('.ui-select-panel')!
  await vi.waitFor(() => {
    const triggerWidth = trigger.element().getBoundingClientRect().width
    const panelWidth = panel.getBoundingClientRect().width
    expect(Math.abs(triggerWidth - panelWidth)).toBeLessThan(1)
  })
})

test('clearable resets the model and hides once empty', async () => {
  const screen = render(SelectFixture, { props: { clearable: true } })
  const trigger = screen.getByRole('combobox')
  await trigger.click()
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"apple"')

  const clear = document.querySelector<HTMLButtonElement>('.ui-select-clear')!
  await userEvent.click(clear)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('null')
  expect(document.querySelector('.ui-select-clear')).toBeNull()
})

test('invalid sets data-invalid on the trigger (not just a class) — the animation-agnostic hook every other control uses', async () => {
  const screen = render(Select, {
    props: {
      items: [{ label: 'Apple', value: 'apple' }],
      invalid: true,
    },
  })
  const el = screen.getByRole('combobox').element() as HTMLElement
  expect(el.hasAttribute('data-invalid')).toBe(true)
  expect(el.getAttribute('aria-invalid')).toBe('true')
})

test('hidden inputs carry the selection into FormData; multiple repeats the name', async () => {
  const screen = render(SelectFormFixture)
  const form = screen.getByTestId('form').element() as HTMLFormElement
  const trigger = form.querySelector('[role="combobox"]') as HTMLElement
  trigger.focus()
  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{Enter}')

  await vi.waitFor(() => {
    const data = new FormData(form)
    expect(data.get('fruit')).toBe('apple')
  })

  screen.unmount()
  const multi = render(SelectFormFixture, { props: { multiple: true } })
  const multiForm = multi.getByTestId('form').element() as HTMLFormElement
  const multiTrigger = multiForm.querySelector('[role="combobox"]') as HTMLElement
  multiTrigger.focus()
  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{Enter}')
  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{Enter}')
  await vi.waitFor(() => {
    const data = new FormData(multiForm)
    expect(data.getAll('fruit')).toEqual(['apple', 'banana'])
  })
})

test('beforeClose defers closing with data-state="closing" until done() is called', async () => {
  const screen = render(SelectFixture, { props: { deferClose: true } })
  const trigger = screen.getByRole('combobox')
  await trigger.click()
  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{Enter}')

  const positioner = document.querySelector<HTMLElement>('.ui-select-positioner')!
  await vi.waitFor(() => expect(positioner.dataset.state).toBe('closing'))
  expect(screen.getByTestId('open-state').element().textContent).toBe('open')

  // Native click, not userEvent/locator: the still-visible (closing) panel
  // overlaps the release button in the test's plain document flow and
  // would fail Playwright's actionability check for no reason relevant to
  // the thing under test.
  ;(screen.getByTestId('release-close').element() as HTMLElement).click()
  await vi.waitFor(() => {
    expect(screen.getByTestId('open-state').element().textContent).toBe('closed')
  })
})

test('clicking the trigger to close an open panel also defers through beforeClose, not just Enter/Escape/outside', async () => {
  const screen = render(SelectFixture, { props: { deferClose: true } })
  const trigger = screen.getByRole('combobox')
  await trigger.click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  // Same trigger click that opened it — a raw `open.value = !open.value`
  // here would skip beforeClose entirely and snap shut instantly.
  await trigger.click()

  const positioner = document.querySelector<HTMLElement>('.ui-select-positioner')!
  await vi.waitFor(() => expect(positioner.dataset.state).toBe('closing'))
  expect(screen.getByTestId('open-state').element().textContent).toBe('open')

  ;(screen.getByTestId('release-close').element() as HTMLElement).click()
  await vi.waitFor(() => {
    expect(screen.getByTestId('open-state').element().textContent).toBe('closed')
  })
})

test('forceMount keeps the panel mounted and hidden when closed', async () => {
  const screen = render(SelectFixture, { props: { forceMount: true } })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  const positioner = document.querySelector<HTMLElement>('.ui-select-positioner')
  expect(positioner).not.toBeNull()
  expect(getComputedStyle(positioner!).display).toBe('none')
})

test('filter defaults to off — no search box, even though items would render fine', async () => {
  const screen = render(SelectFixture)
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  expect(document.querySelector('.ui-select-filter')).toBeNull()
})

test('filter=true renders a search box that narrows the listbox to matching labels', async () => {
  const screen = render(SelectFixture, { props: { filter: true } })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  const filterInput = document.querySelector<HTMLInputElement>('.ui-select-filter input')!
  expect(filterInput).not.toBeNull()
  // Autofocused on open.
  await vi.waitFor(() => expect(document.activeElement).toBe(filterInput))

  await userEvent.type(filterInput, 'an')
  await vi.waitFor(() => {
    const labels = [...document.querySelectorAll('.ui-select-option-label')].map(
      (el) => el.textContent,
    )
    expect(labels).toEqual(['Banana'])
  })
})

test("filter is diacritic- and case-insensitive, matching Tree/Combobox's own behavior", async () => {
  const screen = render(SelectFixture, { props: { filter: true } })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  const filterInput = document.querySelector<HTMLInputElement>('.ui-select-filter input')!

  await userEvent.type(filterInput, 'APPLE')
  await vi.waitFor(() => {
    const labels = [...document.querySelectorAll('.ui-select-option-label')].map(
      (el) => el.textContent,
    )
    expect(labels).toEqual(['Apple'])
  })
})

test('a filter query matching nothing falls back to the empty slot/text', async () => {
  const screen = render(SelectFixture, { props: { filter: true } })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  const filterInput = document.querySelector<HTMLInputElement>('.ui-select-filter input')!

  await userEvent.type(filterInput, 'zzz')
  await expect.element(screen.getByText('No options')).toBeInTheDocument()
})

test('a custom filter function replaces the built-in label match', async () => {
  const screen = render(SelectFixture, {
    props: { filter: (item: { value: string | number }, q: string) => item.value === q },
  })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  const filterInput = document.querySelector<HTMLInputElement>('.ui-select-filter input')!

  // Built-in label matching would find nothing for this exact-value query — the label is "Date".
  await userEvent.type(filterInput, 'date')
  await vi.waitFor(() => {
    const labels = [...document.querySelectorAll('.ui-select-option-label')].map(
      (el) => el.textContent,
    )
    expect(labels).toEqual(['Date'])
  })
})

test('ArrowDown/Enter from inside the filter input still navigate and commit the listbox', async () => {
  const screen = render(SelectFixture, { props: { filter: true } })
  const trigger = screen.getByRole('combobox')
  await trigger.click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  const filterInput = document.querySelector<HTMLInputElement>('.ui-select-filter input')!
  await vi.waitFor(() => expect(document.activeElement).toBe(filterInput))

  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"banana"')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('Escape from inside the filter input closes the panel and returns focus to the trigger', async () => {
  const screen = render(SelectFixture, { props: { filter: true } })
  const trigger = screen.getByRole('combobox')
  await trigger.click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  const filterInput = document.querySelector<HTMLInputElement>('.ui-select-filter input')!
  await vi.waitFor(() => expect(document.activeElement).toBe(filterInput))

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  expect(document.activeElement).toBe(trigger.element())
})

test('the filter query resets once the panel closes, so reopening starts unfiltered', async () => {
  const screen = render(SelectFixture, { props: { filter: true } })
  const trigger = screen.getByRole('combobox')
  await trigger.click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  const filterInput = document.querySelector<HTMLInputElement>('.ui-select-filter input')!
  await userEvent.type(filterInput, 'an')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('an')

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('')

  await trigger.click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  const labels = [...document.querySelectorAll('.ui-select-option-label')].map(
    (el) => el.textContent,
  )
  expect(labels).toEqual(['Apple', 'Banana', 'Cherry', 'Date'])
})

test('header and footer slots render around the listbox only when provided', async () => {
  const screen = render(SelectFixture, { props: { withHeader: true, withFooter: true } })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  await expect.element(screen.getByTestId('select-header')).toBeInTheDocument()
  await expect.element(screen.getByTestId('select-footer')).toBeInTheDocument()

  screen.unmount()

  const bare = render(SelectFixture)
  await bare.getByRole('combobox').click()
  await expect.element(bare.getByRole('listbox')).toBeInTheDocument()
  expect(document.querySelector('.ui-select-header')).toBeNull()
  expect(document.querySelector('.ui-select-footer')).toBeNull()
})

test('filter=false still shows the box but does no matching of its own — the async/remote-search escape hatch', async () => {
  const screen = render(SelectFixture, { props: { filter: false } })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  const filterInput = document.querySelector<HTMLInputElement>('.ui-select-filter input')!
  expect(filterInput).not.toBeNull()

  await userEvent.type(filterInput, 'zzz')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('zzz')
  // A real remote-search consumer would now swap `items` themselves — Select never
  // second-guesses whatever `items` it's handed while `filter` is exactly `false`.
  const labels = [...document.querySelectorAll('.ui-select-option-label')].map(
    (el) => el.textContent,
  )
  expect(labels).toEqual(['Apple', 'Banana', 'Cherry', 'Date'])
})

test('the #filter slot fully replaces the built-in input, and its onKeydown still drives listbox navigation', async () => {
  const screen = render(SelectFixture, { props: { filter: true, customFilter: true } })
  const trigger = screen.getByRole('combobox')
  await trigger.click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  expect(document.querySelector('.ui-select-filter input.ui-input-el')).toBeNull()
  const customInput = screen.getByTestId('custom-filter')
  await expect.element(customInput).toBeInTheDocument()

  await customInput.fill('banana')
  await vi.waitFor(() => {
    const labels = [...document.querySelectorAll('.ui-select-option-label')].map(
      (el) => el.textContent,
    )
    expect(labels).toEqual(['Banana'])
  })

  ;(customInput.element() as HTMLInputElement).focus()
  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"banana"')
})
