import '../src/style.css'
import { h } from 'vue'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import FieldFixture from './fixtures/FieldFixture.vue'
import Field from '../src/components/Field/Field.vue'
import Input from '../src/components/Input/Input.vue'
import Select from '../src/components/Select/Select.vue'
import Button from '../src/components/Button/Button.vue'
import Textarea from '../src/components/Textarea/Textarea.vue'

test('label "for" points at the control\'s id', async () => {
  const screen = await render(FieldFixture, { props: { label: 'Name' } })
  const label = screen.container.querySelector<HTMLLabelElement>('.ui-field-label')!
  const input = screen.container.querySelector<HTMLInputElement>('.ui-input-el')!
  expect(label.getAttribute('for')).toBe(input.id)
  expect(input.id).not.toBe('')
})

test('describedby composes description+error ids and drops absent ones', async () => {
  const bare = await render(FieldFixture, { props: {} })
  const bareInput = bare.container.querySelector<HTMLInputElement>('.ui-input-el')!
  expect(bareInput.getAttribute('aria-describedby')).toBeNull()

  const withDescription = await render(FieldFixture, { props: { description: 'Helper text' } })
  const descInput = withDescription.container.querySelector<HTMLInputElement>('.ui-input-el')!
  const descId = withDescription.container.querySelector('.ui-field-description')!.id
  expect(descInput.getAttribute('aria-describedby')).toBe(descId)

  const withBoth = await render(FieldFixture, {
    props: { description: 'Helper text', error: 'Required' },
  })
  const bothInput = withBoth.container.querySelector<HTMLInputElement>('.ui-input-el')!
  const bothDescId = withBoth.container.querySelector('.ui-field-description')!.id
  const bothErrorId = withBoth.container.querySelector('.ui-field-error')!.id
  expect(bothInput.getAttribute('aria-describedby')).toBe(`${bothDescId} ${bothErrorId}`)
})

test('error flips aria-invalid on the slotted Input and renders role="alert"', async () => {
  const screen = await render(FieldFixture, { props: { error: 'Required field' } })
  const input = screen.container.querySelector<HTMLInputElement>('.ui-input-el')!
  expect(input.getAttribute('aria-invalid')).toBe('true')
  const error = screen.container.querySelector('.ui-field-error')!
  expect(error.getAttribute('role')).toBe('alert')
  expect(error.textContent).toBe('Required field')
  expect(screen.container.querySelector('.ui-field')!.hasAttribute('data-invalid')).toBe(true)
})

test("data-focused/data-filled mirror the control's focus and value reports", async () => {
  const screen = await render(FieldFixture, {})
  const root = screen.container.querySelector('.ui-field')!
  expect(root.hasAttribute('data-focused')).toBe(false)
  expect(root.hasAttribute('data-filled')).toBe(false)

  await userEvent.click(page.getByPlaceholder('Type here'))
  await vi.waitFor(() => expect(root.hasAttribute('data-focused')).toBe(true))

  await userEvent.fill(page.getByPlaceholder('Type here'), 'hello')
  await vi.waitFor(() => expect(root.hasAttribute('data-filled')).toBe(true))

  await userEvent.click(screen.getByTestId('fill').element())
  await userEvent.keyboard('{Tab}')
  await vi.waitFor(() => expect(root.hasAttribute('data-focused')).toBe(false))
})

test("Field's disabled alone disables a nested control with no local disabled prop", async () => {
  const screen = await render(Field, {
    props: { label: 'Locked', disabled: true },
    slots: { default: () => h(Input) },
  })
  const input = screen.container.querySelector<HTMLInputElement>('.ui-input-el')!
  expect(input.disabled).toBe(true)
  expect(screen.container.querySelector('.ui-input--disabled')).not.toBeNull()
})

test('controls work standalone with no Field ancestor — no throw, own generated id', async () => {
  const screen = await render(Input, { props: { placeholder: 'standalone' } })
  const input = screen.container.querySelector<HTMLInputElement>('.ui-input-el')!
  expect(input.id).not.toBe('')
  expect(input.getAttribute('aria-describedby')).toBeNull()
  expect(input.getAttribute('aria-invalid')).toBeNull()
})

test('float placement flips data-filled when the input gets a value programmatically', async () => {
  const screen = await render(FieldFixture, { props: { labelPlacement: 'float', label: 'Email' } })
  const root = screen.container.querySelector('.ui-field')!
  expect(root.hasAttribute('data-filled')).toBe(false)

  await screen.getByTestId('fill').click()
  await vi.waitFor(() => expect(root.hasAttribute('data-filled')).toBe(true))
})

test('#label slot replaces the label text but keeps the <label> element and for-wiring', async () => {
  const screen = await render(Field, {
    slots: { label: '<strong data-testid="custom-label">Custom</strong>', default: '' },
  })
  const label = screen.container.querySelector('label')!
  expect(label).not.toBeNull()
  expect(screen.container.querySelector('[data-testid="custom-label"]')).not.toBeNull()
})

// Regression test: a `float`-placement label's resting position was a fixed 0.75rem offset that
// assumed no leading content, so it sat on top of a control's `#start` slot (an icon, say)
// instead of clearing it. Input reports its measured start-inset to the nearest Field, which
// widens the label's resting inset by that amount.
test("float label's resting inset clears a leading #start icon instead of overlapping it", async () => {
  const withoutIcon = await render(FieldFixture, {
    props: { labelPlacement: 'float', label: 'Amount' },
  })
  const labelNoIcon = withoutIcon.container.querySelector<HTMLElement>('.ui-field-label')!
  const insetNoIcon = Number.parseFloat(getComputedStyle(labelNoIcon).insetInlineStart)

  const screen = await render(FieldFixture, {
    props: { labelPlacement: 'float', label: 'Amount' },
    slots: { start: '<span style="display:inline-block;inline-size:24px">$</span>' },
  })
  const control = screen.container.querySelector<HTMLElement>('.ui-field-control')!
  await vi.waitFor(() => {
    const inset = getComputedStyle(control).getPropertyValue('--ui-field-start-inset')
    expect(Number.parseFloat(inset)).toBeGreaterThan(0)
  })
  const labelWithIcon = screen.container.querySelector<HTMLElement>('.ui-field-label')!
  const insetWithIcon = Number.parseFloat(getComputedStyle(labelWithIcon).insetInlineStart)

  expect(insetWithIcon).toBeGreaterThan(insetNoIcon)
})

test('required: the asterisk stays out of the label text and aria-required marks the control', async () => {
  const screen = await render({
    render: () => h(Field, { label: 'Username', required: true }, () => h(Input as any)),
  })
  const label = screen.container.querySelector<HTMLLabelElement>('.ui-field-label')!
  const marker = label.querySelector<HTMLElement>('.ui-field-required')!
  expect(marker.getAttribute('aria-hidden')).toBe('true')
  expect(getComputedStyle(marker, '::after').content).toContain('*')
  expect(label.textContent!.trim()).toBe('Username')
  await expect.element(page.getByLabelText('Username', { exact: true })).toBeInTheDocument()
  await expect
    .element(page.getByRole('textbox', { name: 'Username', exact: true }))
    .toHaveAttribute('aria-required', 'true')
})

test('start placement puts the label beside the control and the description under the control', async () => {
  const screen = await render(FieldFixture, {
    props: { labelPlacement: 'start', label: 'Username', description: 'Public name.' },
  })
  const label = screen.container
    .querySelector<HTMLElement>('.ui-field-label')!
    .getBoundingClientRect()
  const frame = screen.container.querySelector<HTMLElement>('.ui-input')!.getBoundingClientRect()
  const description = screen.container
    .querySelector<HTMLElement>('.ui-field-description')!
    .getBoundingClientRect()
  expect(label.right).toBeLessThanOrEqual(frame.left)
  expect(Math.abs(label.top + label.height / 2 - (frame.top + frame.height / 2))).toBeLessThan(2)
  expect(description.top).toBeGreaterThanOrEqual(frame.bottom)
  expect(Math.round(description.left)).toBe(Math.round(frame.left))
})

test('end placement puts the label after the control', async () => {
  const screen = await render(FieldFixture, { props: { labelPlacement: 'end', label: 'kg' } })
  const label = screen.container
    .querySelector<HTMLElement>('.ui-field-label')!
    .getBoundingClientRect()
  const frame = screen.container.querySelector<HTMLElement>('.ui-input')!.getBoundingClientRect()
  expect(label.left).toBeGreaterThanOrEqual(frame.right)
})

test('labelWidth sizes the label column from a number or a CSS length', async () => {
  const px = await render(FieldFixture, {
    props: { labelPlacement: 'start', label: 'A', labelWidth: 120 },
  })
  expect(px.container.querySelector<HTMLElement>('.ui-field-label')!.offsetWidth).toBe(120)

  const rem = await render(FieldFixture, {
    props: { labelPlacement: 'start', label: 'A', labelWidth: '10rem' },
  })
  const rootFont = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  expect(rem.container.querySelector<HTMLElement>('.ui-field-label')!.offsetWidth).toBe(
    10 * rootFont,
  )
})

test('labelWidth and labelAlign are ignored outside start/end placements', async () => {
  const screen = await render(FieldFixture, {
    props: {
      labelPlacement: 'top',
      label: 'A',
      labelWidth: 120,
      labelAlign: 'end',
      attached: true,
    },
  })
  const root = screen.container.querySelector<HTMLElement>('.ui-field')!
  expect(root.style.getPropertyValue('--ui-field-label-width')).toBe('')
  expect(root.hasAttribute('data-label-align')).toBe(false)
  expect(root.hasAttribute('data-attached')).toBe(false)
})

test('attached: the label joins the frame with no gap, matches its height, and still focuses the control', async () => {
  const screen = await render(FieldFixture, {
    props: { labelPlacement: 'start', label: 'Username', attached: true },
  })
  const labelEl = screen.container.querySelector<HTMLElement>('.ui-field-label')!
  const frameEl = screen.container.querySelector<HTMLElement>('.ui-input')!
  const label = labelEl.getBoundingClientRect()
  const frame = frameEl.getBoundingClientRect()
  expect(Math.round(label.right)).toBe(Math.round(frame.left))
  expect(Math.round(label.height)).toBe(Math.round(frame.height))
  expect(getComputedStyle(frameEl).borderStartStartRadius).toBe('0px')

  await userEvent.click(labelEl)
  expect(document.activeElement).toBe(screen.container.querySelector('.ui-input-el'))
  await expect.element(page.getByRole('textbox', { name: 'Username' })).toBeInTheDocument()
})

test('attached: the label cell follows focus and error state', async () => {
  const screen = await render(FieldFixture, {
    props: { labelPlacement: 'start', label: 'Username', attached: true, error: 'Required' },
  })
  const labelEl = screen.container.querySelector<HTMLElement>('.ui-field-label')!
  const danger = getComputedStyle(labelEl).borderTopColor
  await screen.rerender({ error: undefined })
  const resting = getComputedStyle(labelEl).borderTopColor
  expect(danger).not.toBe(resting)
  await userEvent.click(screen.container.querySelector('.ui-input-el')!)
  await vi.waitFor(() => expect(getComputedStyle(labelEl).borderTopColor).not.toBe(resting))
})

test('attached: a focused Select trigger recolors with its label, but an invalid one stays danger', async () => {
  const items = [{ label: 'Pro', value: 'pro' }]
  const screen = await render({
    components: { Field, Select },
    data: () => ({ items }),
    template: `<Field label="Plan" label-placement="start" attached><Select :items="items" /></Field>`,
  })
  const trigger = screen.container.querySelector<HTMLElement>('.ui-select-trigger')!
  const resting = getComputedStyle(trigger).borderTopColor
  trigger.focus()
  await vi.waitFor(() => expect(getComputedStyle(trigger).borderTopColor).not.toBe(resting))
  const label = screen.container.querySelector<HTMLElement>('.ui-field-label')!
  expect(getComputedStyle(trigger).borderTopColor).toBe(getComputedStyle(label).borderTopColor)

  const invalid = await render({
    components: { Field, Select },
    data: () => ({ items }),
    template: `<Field label="Plan" label-placement="start" attached error="Required"><Select :items="items" /></Field>`,
  })
  const invalidTrigger = invalid.container.querySelector<HTMLElement>('.ui-select-trigger')!
  const danger = getComputedStyle(invalidTrigger).borderTopColor
  invalidTrigger.focus()
  await vi.waitFor(() =>
    expect(invalid.container.querySelector('.ui-field')!.hasAttribute('data-focused')).toBe(true),
  )
  expect(getComputedStyle(invalidTrigger).borderTopColor).toBe(danger)
})

test('#prepend/#append join cells to the control: flush, same height, inner corners flattened', async () => {
  const screen = await render(FieldFixture, {
    props: { label: 'Site', ui: { prepend: 'my-prepend', append: 'my-append' } },
    slots: { prepend: 'https://', append: '.com' },
  })
  const frameEl = screen.container.querySelector<HTMLElement>('.ui-input')!
  const prependEl = screen.container.querySelector<HTMLElement>('.ui-field-prepend')!
  const appendEl = screen.container.querySelector<HTMLElement>('.ui-field-append')!
  expect(prependEl).toHaveClass('my-prepend')
  expect(appendEl).toHaveClass('my-append')
  const frame = frameEl.getBoundingClientRect()
  const prepend = prependEl.getBoundingClientRect()
  const append = appendEl.getBoundingClientRect()
  expect(Math.round(prepend.right)).toBe(Math.round(frame.left))
  expect(Math.round(append.left)).toBe(Math.round(frame.right))
  expect(Math.round(prepend.height)).toBe(Math.round(frame.height))
  const style = getComputedStyle(frameEl)
  expect(style.borderStartStartRadius).toBe('0px')
  expect(style.borderEndEndRadius).toBe('0px')
  await expect.element(page.getByRole('textbox', { name: 'Site' })).toBeInTheDocument()
})

test('#prepend works for any control: a Select trigger and a growing Textarea both join and stretch', async () => {
  const items = [{ label: 'Pro', value: 'pro' }]
  const screen = await render({
    components: { Field, Select, Textarea },
    data: () => ({ items, notes: 'one\ntwo\nthree\nfour' }),
    template: `<div>
      <Field label="Plan"><template #prepend>Tier</template><Select :items="items" /></Field>
      <Field label="Notes"><template #prepend>Note</template><Textarea v-model="notes" :rows="4" /></Field>
    </div>`,
  })
  const [selectCell, textareaCell] =
    screen.container.querySelectorAll<HTMLElement>('.ui-field-prepend')
  const trigger = screen.container.querySelector<HTMLElement>('.ui-select-trigger')!
  const textarea = screen.container.querySelector<HTMLElement>('.ui-textarea')!
  expect(Math.round(selectCell!.getBoundingClientRect().right)).toBe(
    Math.round(trigger.getBoundingClientRect().left),
  )
  expect(getComputedStyle(trigger).borderStartStartRadius).toBe('0px')
  expect(Math.round(textareaCell!.getBoundingClientRect().height)).toBe(
    Math.round(textarea.getBoundingClientRect().height),
  )
})

test('a Select inside #prepend drops its own border so the divider is the only line', async () => {
  const items = [{ label: '+233', value: '+233' }]
  const screen = await render({
    components: { Field, Input, Select },
    data: () => ({ items }),
    template: `<Field><template #prepend><Select :items="items" /></template><Input /></Field>`,
  })
  const trigger = screen.container.querySelector<HTMLElement>('.ui-select-trigger')!
  expect(getComputedStyle(trigger).borderTopWidth).toBe('0px')
  const cell = screen.container.querySelector<HTMLElement>('.ui-field-prepend')!
  expect(Math.round(trigger.getBoundingClientRect().height)).toBe(
    Math.round(cell.getBoundingClientRect().height - 2),
  )
})

test("float label's resting position clears a #prepend cell", async () => {
  const screen = await render(FieldFixture, {
    props: { labelPlacement: 'float', label: 'Amount' },
    slots: { prepend: '<span style="display:inline-block;inline-size:40px">USD</span>' },
  })
  const cell = screen.container.querySelector<HTMLElement>('.ui-field-prepend')!
  const label = screen.container.querySelector<HTMLElement>('.ui-field-label')!
  await vi.waitFor(() =>
    expect(label.getBoundingClientRect().left).toBeGreaterThan(cell.getBoundingClientRect().right),
  )
})

test('--ui-field-cell-bg/-color theme every joined cell, attached labels included', async () => {
  const screen = await render({
    components: { Field, Input },
    template: `<div style="--ui-field-cell-bg: rgb(1, 2, 3); --ui-field-cell-color: rgb(4, 5, 6)">
      <Field label="Name" label-placement="start" attached><template #append>x</template><Input /></Field>
    </div>`,
  })
  for (const el of screen.container.querySelectorAll<HTMLElement>(
    '.ui-field-label, .ui-field-append',
  )) {
    expect(getComputedStyle(el).backgroundColor).toBe('rgb(1, 2, 3)')
    expect(getComputedStyle(el).color).toBe('rgb(4, 5, 6)')
  }
})

test('no group wrapper or join attributes without #prepend/#append', async () => {
  const screen = await render(FieldFixture, { props: { label: 'Name' } })
  expect(screen.container.querySelector('.ui-field-group')).toBeNull()
  expect(screen.container.querySelector('.ui-field')!.hasAttribute('data-joined')).toBe(false)
  expect(
    getComputedStyle(screen.container.querySelector('.ui-input')!).borderStartStartRadius,
  ).not.toBe('0px')
})

// Regression test: a control inside a cell used to inject the Field's context too, so it claimed
// the same id as the main control and the label/error pointed at both.
test('a control inside #prepend stands alone: own id, no Field label, error or required state', async () => {
  const items = [{ label: '+233', value: '+233' }]
  const screen = await render({
    components: { Field, Input, Select },
    data: () => ({ items }),
    template: `<Field label="Phone" error="Required" required>
      <template #prepend><Select :items="items" aria-label="Country code" /></template>
      <Input />
    </Field>`,
  })
  const trigger = screen.container.querySelector<HTMLElement>('.ui-select-trigger')!
  const input = screen.container.querySelector<HTMLInputElement>('.ui-input-el')!
  const label = screen.container.querySelector<HTMLLabelElement>('.ui-field-label')!
  expect(trigger.id).not.toBe(input.id)
  expect(label.getAttribute('for')).toBe(input.id)
  expect(input.getAttribute('aria-invalid')).toBe('true')
  expect(trigger.hasAttribute('aria-invalid')).toBe(false)
  expect(trigger.hasAttribute('aria-required')).toBe(false)
  await expect.element(page.getByRole('textbox', { name: 'Phone' })).toBeInTheDocument()
})

// Field's join rules live in @layer ui-components, so they apply to any frame whose own styles sit
// in that layer (or an earlier one); unlayered consumer CSS wins, as everywhere else in the library.
test("a consumer's own control opts into joining with data-ui-frame", async () => {
  const style = document.createElement('style')
  style.textContent =
    '@layer ui-components { .own-frame { border: 1px solid; border-radius: 6px; } }'
  document.head.append(style)
  const screen = await render({
    components: { Field },
    template: `<Field label="Custom">
      <template #prepend>@</template>
      <input class="own-frame" data-ui-frame />
    </Field>`,
  })
  const own = screen.container.querySelector<HTMLElement>('.own-frame')!
  expect(getComputedStyle(own).borderStartStartRadius).toBe('0px')
  expect(getComputedStyle(own).borderStartEndRadius).toBe('6px')
  expect(screen.container.querySelector('.ui-field')!.hasAttribute('data-join-start')).toBe(true)
  style.remove()
})

test('cells match the control size: sm/lg frames give cells the same radius and font size', async () => {
  for (const size of ['sm', 'lg'] as const) {
    const screen = await render({
      components: { Field, Input },
      data: () => ({ size }),
      template: `<Field label="Size"><template #prepend>$</template><Input :size="size" /></Field>`,
    })
    const frame = screen.container.querySelector<HTMLElement>('.ui-input')!
    const cell = screen.container.querySelector<HTMLElement>('.ui-field-prepend')!
    expect(getComputedStyle(cell).borderStartStartRadius).toBe(
      getComputedStyle(frame).borderEndEndRadius,
    )
    expect(getComputedStyle(cell).fontSize).toBe(getComputedStyle(frame).fontSize)
    screen.unmount()
  }
})

test('clicking a text cell focuses the control; an interactive child in a cell keeps its click', async () => {
  const onClick = vi.fn()
  const screen = await render({
    components: { Field, Input },
    methods: { onClick },
    template: `<Field label="Site">
      <template #prepend>https://</template>
      <Input />
      <template #append><button type="button" @click="onClick">Go</button></template>
    </Field>`,
  })
  const input = screen.container.querySelector<HTMLInputElement>('.ui-input-el')!
  await userEvent.click(screen.container.querySelector<HTMLElement>('.ui-field-prepend')!)
  expect(document.activeElement).toBe(input)
  await userEvent.click(screen.getByRole('button', { name: 'Go' }))
  expect(onClick).toHaveBeenCalledOnce()
  expect(document.activeElement).not.toBe(input)
})

test('attached label stretches to a growing Textarea and truncates inside a narrow label-width', async () => {
  const screen = await render({
    components: { Field, Textarea },
    data: () => ({ notes: 'one\ntwo\nthree\nfour\nfive' }),
    template: `<Field label="A very long attached label text" label-placement="start" attached :label-width="80">
      <Textarea v-model="notes" :rows="5" />
    </Field>`,
  })
  const label = screen.container.querySelector<HTMLElement>('.ui-field-label')!
  const textarea = screen.container.querySelector<HTMLElement>('.ui-textarea')!
  expect(Math.round(label.getBoundingClientRect().height)).toBe(
    Math.round(textarea.getBoundingClientRect().height),
  )
  expect(label.offsetWidth).toBe(80)
  const text = label.querySelector<HTMLElement>('.ui-field-label-text')!
  expect(text.scrollWidth).toBeGreaterThan(text.clientWidth)
  expect(getComputedStyle(text).textOverflow).toBe('ellipsis')
})

// Regression test: with a reset making svg display:block (Tailwind's preflight does), an icon in
// #label wrapped onto its own line, and label-align="end" pushed the text away from it.
test('an icon in #label stays on the same line as the text under an svg display:block reset', async () => {
  const style = document.createElement('style')
  style.textContent = 'svg { display: block; }'
  document.head.append(style)
  for (const labelPlacement of ['top', 'start'] as const) {
    const screen = await render({
      components: { Field, Input },
      data: () => ({ labelPlacement }),
      template: `<Field :label-placement="labelPlacement" label-align="end" :label-width="120">
        <template #label><svg width="12" height="12" data-testid="icon" /><span data-testid="text">Email</span></template>
        <Input />
      </Field>`,
    })
    const icon = screen.container.querySelector('[data-testid="icon"]')!.getBoundingClientRect()
    const text = screen.container.querySelector('[data-testid="text"]')!.getBoundingClientRect()
    expect(Math.abs(icon.top + icon.height / 2 - (text.top + text.height / 2))).toBeLessThan(2)
    expect(text.left - icon.right).toBeLessThan(10)
    screen.unmount()
  }
  style.remove()
})

test('a cell mixing text with a control keeps its padding; a control alone still fills the cell', async () => {
  const items = [{ label: 'USD', value: 'usd' }]
  const screen = await render({
    components: { Field, Input, Select },
    data: () => ({ items, symbol: '$' }),
    template: `<div>
      <Field label="Mixed"><template #prepend>{{ symbol }}<Select :items="items" aria-label="Currency" /></template><Input /></Field>
      <Field label="Alone"><template #prepend><Select :items="items" aria-label="Currency" /></template><Input /></Field>
    </div>`,
  })
  const [mixed, alone] = screen.container.querySelectorAll<HTMLElement>('.ui-field-prepend')
  await vi.waitFor(() => expect(mixed!.hasAttribute('data-mixed')).toBe(true))
  expect(getComputedStyle(mixed!).paddingInlineStart).toBe('12px')
  const mixedTrigger = mixed!.querySelector<HTMLElement>('.ui-select-trigger')!
  expect(getComputedStyle(mixedTrigger).borderStartStartRadius).toBe('0px')
  expect(alone!.hasAttribute('data-mixed')).toBe(false)
  expect(getComputedStyle(alone!).paddingInlineStart).toBe('0px')
})

test('the mixed flag follows the cell content as it changes', async () => {
  const items = [{ label: 'USD', value: 'usd' }]
  const screen = await render({
    components: { Field, Input, Select },
    data: () => ({ items, symbol: '' }),
    template: `<div>
      <button data-testid="add" @click="symbol = '$'">add</button>
      <Field label="Amount"><template #prepend>{{ symbol }}<Select :items="items" aria-label="Currency" /></template><Input /></Field>
    </div>`,
  })
  const cell = screen.container.querySelector<HTMLElement>('.ui-field-prepend')!
  expect(cell.hasAttribute('data-mixed')).toBe(false)
  await userEvent.click(screen.getByTestId('add'))
  await vi.waitFor(() => expect(cell.hasAttribute('data-mixed')).toBe(true))
})

const cellItems = [{ label: 'USD', value: 'usd' }]

async function renderCell(prepend: string, opts: { dir?: string; fieldAttrs?: string } = {}) {
  const screen = await render({
    components: { Field, Input, Select, Button },
    data: () => ({ items: cellItems }),
    template: `<div dir="${opts.dir ?? 'ltr'}" style="inline-size: 28rem">
      <Field label="Amount" ${opts.fieldAttrs ?? ''}><template #prepend>${prepend}</template><Input /></Field>
    </div>`,
  })
  const cell = screen.container.querySelector<HTMLElement>('.ui-field-prepend')!
  await vi.waitFor(() => expect(cell.hasAttribute('data-mixed')).toBe(true))
  return { screen, cell, rect: (el: Element) => el.getBoundingClientRect() }
}

test('text + control: one divider between them, the control runs flush to the cell edge', async () => {
  const { cell, rect } = await renderCell('$<Select :items="items" aria-label="Currency" />')
  const trigger = cell.querySelector<HTMLElement>('.ui-select-trigger')!
  expect(trigger.getAttribute('data-cell-before')).toBe('text')
  expect(trigger.hasAttribute('data-cell-after')).toBe(false)
  expect(getComputedStyle(trigger).borderInlineStartWidth).toBe('1px')
  expect(getComputedStyle(trigger).borderInlineEndWidth).toBe('0px')
  expect(Math.round(rect(trigger).right)).toBe(Math.round(rect(cell).right))
  expect(Math.round(rect(trigger).height)).toBe(Math.round(rect(cell).height - 2))
})

test('control + control: a single shared divider and no gap', async () => {
  const { cell, rect } = await renderCell(
    '<Select :items="items" aria-label="Currency" /><Button variant="ghost">Go</Button>',
  )
  const trigger = cell.querySelector<HTMLElement>('.ui-select-trigger')!
  const button = cell.querySelector<HTMLElement>('.ui-button')!
  expect(Math.round(rect(trigger).left)).toBe(Math.round(rect(cell).left + 1))
  expect(Math.round(rect(button).left)).toBe(Math.round(rect(trigger).right))
  expect(getComputedStyle(trigger).borderInlineEndWidth).toBe('0px')
  expect(getComputedStyle(button).borderInlineStartWidth).toBe('1px')
})

test('control + text + control: each control gets a divider on its text side only', async () => {
  const { cell } = await renderCell(
    '<Select :items="items" aria-label="Currency" /> per <Button variant="ghost">Go</Button>',
  )
  const trigger = cell.querySelector<HTMLElement>('.ui-select-trigger')!
  const button = cell.querySelector<HTMLElement>('.ui-button')!
  expect(trigger.getAttribute('data-cell-after')).toBe('text')
  expect(button.getAttribute('data-cell-before')).toBe('text')
  expect(getComputedStyle(trigger).borderInlineEndWidth).toBe('1px')
  expect(getComputedStyle(button).borderInlineStartWidth).toBe('1px')
})

test('icon + text without a control stays one plain cell', async () => {
  const screen = await render({
    components: { Field, Input },
    template: `<Field label="Site"><template #prepend><svg width="12" height="12" /> https://</template><Input /></Field>`,
  })
  const cell = screen.container.querySelector<HTMLElement>('.ui-field-prepend')!
  expect(cell.hasAttribute('data-mixed')).toBe(false)
  expect(getComputedStyle(cell).paddingInlineStart).toBe('12px')
})

test('two controls in a cell get their own ids; a disabled Field disables them and focus lights the row', async () => {
  const { screen, cell } = await renderCell(
    '<Select :items="items" aria-label="Currency" /><Select :items="items" aria-label="Unit" />',
    { fieldAttrs: 'disabled' },
  )
  const [a, b] = cell.querySelectorAll<HTMLElement>('.ui-select-trigger')
  const input = screen.container.querySelector<HTMLInputElement>('.ui-input-el')!
  expect(new Set([a!.id, b!.id, input.id]).size).toBe(3)
  expect(a!.getAttribute('aria-disabled')).toBe('true')
  expect(b!.getAttribute('aria-disabled')).toBe('true')

  const enabled = await renderCell('$<Select :items="items" aria-label="Currency" />')
  const trigger = enabled.cell.querySelector<HTMLElement>('.ui-select-trigger')!
  trigger.focus()
  await vi.waitFor(() =>
    expect(trigger.closest('.ui-field')!.hasAttribute('data-focused')).toBe(true),
  )
})

test('segments follow content added at runtime', async () => {
  const screen = await render({
    components: { Field, Input, Select, Button },
    data: () => ({ items: cellItems, go: false }),
    template: `<div>
      <button data-testid="toggle" @click="go = true">toggle</button>
      <Field label="Amount"><template #prepend><Select :items="items" aria-label="Currency" /><Button v-if="go" variant="ghost">Go</Button></template><Input /></Field>
    </div>`,
  })
  const cell = screen.container.querySelector<HTMLElement>('.ui-field-prepend')!
  const trigger = cell.querySelector<HTMLElement>('.ui-select-trigger')!
  expect(cell.hasAttribute('data-mixed')).toBe(false)
  await userEvent.click(screen.getByTestId('toggle'))
  await vi.waitFor(() => expect(trigger.getAttribute('data-cell-after')).toBe('control'))
  expect(cell.hasAttribute('data-mixed')).toBe(true)
})

test('segments mirror in RTL', async () => {
  const { cell, rect } = await renderCell('$<Select :items="items" aria-label="Currency" />', {
    dir: 'rtl',
  })
  const trigger = cell.querySelector<HTMLElement>('.ui-select-trigger')!
  expect(Math.round(rect(trigger).left)).toBe(Math.round(rect(cell).left))
  expect(getComputedStyle(trigger).borderRightWidth).toBe('1px')
})

test("a filled control on a cell's outer edge takes the cell's rounding, a middle one stays square", async () => {
  const screen = await render({
    components: { Field, Input, Select, Button },
    data: () => ({ items: cellItems }),
    template: `<Field label="Search"><Input /><template #append><Select :items="items" aria-label="Scope" /><Button>Go</Button></template></Field>`,
  })
  const cell = screen.container.querySelector<HTMLElement>('.ui-field-append')!
  await vi.waitFor(() => expect(cell.hasAttribute('data-mixed')).toBe(true))
  const button = cell.querySelector<HTMLElement>('.ui-button')!
  const trigger = cell.querySelector<HTMLElement>('.ui-select-trigger')!
  expect(getComputedStyle(button).borderStartEndRadius).toBe(
    getComputedStyle(cell).borderStartEndRadius,
  )
  expect(getComputedStyle(button).borderStartEndRadius).not.toBe('0px')
  expect(getComputedStyle(button).borderStartStartRadius).toBe('0px')
  expect(getComputedStyle(trigger).borderStartEndRadius).toBe('0px')
})

test("inset label's caption clears a #prepend cell", async () => {
  const screen = await render(FieldFixture, {
    props: { labelPlacement: 'inset', label: 'Amount' },
    slots: { prepend: '<span style="display:inline-block;inline-size:40px">USD</span>' },
  })
  const cell = screen.container.querySelector<HTMLElement>('.ui-field-prepend')!
  const label = screen.container.querySelector<HTMLElement>('.ui-field-label')!
  await vi.waitFor(() =>
    expect(label.getBoundingClientRect().left).toBeGreaterThan(cell.getBoundingClientRect().right),
  )
})

test('required marker shows inside an attached label cell, next to the text', async () => {
  const screen = await render(FieldFixture, {
    props: { labelPlacement: 'start', label: 'Username', attached: true, required: true },
  })
  const label = screen.container.querySelector<HTMLElement>('.ui-field-label')!
  const text = label.querySelector<HTMLElement>('.ui-field-label-text')!.getBoundingClientRect()
  const marker = label.querySelector<HTMLElement>('.ui-field-required')!.getBoundingClientRect()
  const cell = label.getBoundingClientRect()
  expect(marker.left - text.right).toBeLessThan(6)
  expect(marker.right).toBeLessThanOrEqual(cell.right)
  expect(marker.width).toBeGreaterThan(0)
})
