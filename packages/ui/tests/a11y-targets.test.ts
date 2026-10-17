// WCAG 2.5.8: small pointer targets own at least 24x24px of hit area at the same painted size.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import Combobox from '../src/components/Combobox/Combobox.vue'
import InputNumber from '../src/components/InputNumber/InputNumber.vue'
import PasswordInput from '../src/components/PasswordInput/PasswordInput.vue'
import Rating from '../src/components/Rating/Rating.vue'
import Select from '../src/components/Select/Select.vue'

const items = [
  { label: 'Apple', value: 'a' },
  { label: 'Banana', value: 'b' },
]
const sizes = ['sm', 'md', 'lg'] as const

function hits(el: Element, x: number, y: number) {
  const hit = document.elementFromPoint(x, y)
  return !!hit && el.contains(hit)
}
// Every probe in [x0, x1] x [y0, y1] lands on `el`; 1px inset since shared edges can hit either side.
function owns(el: Element, x0: number, y0: number, x1: number, y1: number) {
  const misses: string[] = []
  for (let x = x0 + 1; x <= x1 - 1; x += 1)
    for (let y = y0 + 1; y <= y1 - 1; y += 1)
      if (!hits(el, x, y)) misses.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  return misses
}
function rect(el: Element) {
  return el.getBoundingClientRect()
}
// Chip removes and clears are 24px boxes that paint a smaller circle with ::before.
function paintedWidth(el: Element) {
  return el.matches('.ui-combobox-chevron')
    ? rect(el).width
    : parseFloat(getComputedStyle(el, '::before').width)
}
// A 24x24 box centred on the target, or anchored to the edge it may grow away from.
function box24(el: Element, anchor: 'center' | 'end' | 'start' = 'center') {
  const r = rect(el)
  const cy = r.top + r.height / 2
  const x0 =
    anchor === 'end' ? r.right - 24 : anchor === 'start' ? r.left : r.left + r.width / 2 - 12
  return [x0, cy - 12, x0 + 24, cy + 12] as const
}

for (const size of sizes) {
  test(`${size}: multi Select/Combobox chip remove buttons own 24x24 without growing`, async () => {
    const screen = await render(() =>
      h('div', { style: 'padding: 2rem; inline-size: 300px; display: grid; gap: 2rem' }, [
        h(Select as never, { items, modelValue: ['a', 'b'], multiple: true, size }),
        h(Combobox as never, { items, modelValue: ['a', 'b'], multiple: true, size }),
      ]),
    )
    const removes = screen.container.querySelectorAll('.ui-chip-remove')
    expect(removes).toHaveLength(4)
    for (const el of removes) {
      const painted = getComputedStyle(el, '::before')
      expect([painted.width, painted.height]).toEqual(['16px', '16px'])
      expect(owns(el, ...box24(el))).toEqual([])
    }
  })

  test(`${size}: Select/Combobox clear and the Combobox chevron each own 24x24 without overlapping`, async () => {
    const screen = await render(() =>
      h('div', { style: 'padding: 2rem; inline-size: 300px; display: grid; gap: 2rem' }, [
        h(Select as never, { items, modelValue: 'a', clearable: true, size }),
        h(Combobox as never, { items, modelValue: 'a', clearable: true, size }),
      ]),
    )
    const c = screen.container
    const before = [
      ...c.querySelectorAll('.ui-select-clear, .ui-combobox-clear, .ui-combobox-chevron'),
    ]
    expect(before).toHaveLength(3)
    for (const el of before) expect(paintedWidth(el)).toBeLessThan(24)
    // The clear grows away from the chevron (toward the value), the chevron away from the clear.
    for (const el of c.querySelectorAll('.ui-select-clear, .ui-combobox-clear'))
      expect(owns(el, ...box24(el, 'end'))).toEqual([])
    const chevron = c.querySelector('.ui-combobox-chevron')!
    expect(owns(chevron, ...box24(chevron, 'start'))).toEqual([])
  })

  test(`${size}: PasswordInput toggle owns 24x24`, async () => {
    const screen = await render(PasswordInput, { props: { modelValue: 'secret', size } })
    const toggle = screen.container.querySelector('.ui-password-input-toggle')!
    expect(owns(toggle, ...box24(toggle))).toEqual([])
  })
}

test('sm/md: PasswordInput toggle keeps its painted size', async () => {
  const screen = await render(() =>
    h('div', [h(PasswordInput, { size: 'sm' }), h(PasswordInput, { size: 'md' })]),
  )
  const [sm, md] = screen.container.querySelectorAll('.ui-password-input-toggle')
  expect(rect(sm!).width).toBe(22)
  expect(rect(md!).width).toBe(26)
})

for (const size of ['sm', 'md'] as const) {
  // Rating is one slider target, so its hit area grows to 24px tall across the row.
  test(`${size}: Rating's slider hit area is 24px tall across every star`, async () => {
    const screen = await render(() =>
      h('div', { style: 'padding: 2rem' }, [h(Rating, { modelValue: 2, size })]),
    )
    const root = screen.container.querySelector('.ui-rating')!
    const stars = screen.container.querySelectorAll('.ui-rating-item')
    const px = size === 'sm' ? 16 : 20
    expect(rect(root).height).toBe(px)
    for (const star of stars) {
      const r = rect(star)
      expect([r.width, r.height]).toEqual([px, px])
      expect(owns(root, r.left, r.top + px / 2 - 12, r.right, r.top + px / 2 + 12)).toEqual([])
    }
  })
}

for (const size of sizes) {
  // Stacked steppers each own half the field's height (see InputNumber.css).
  test(`${size}: stacked InputNumber steppers each own a full half of the field`, async () => {
    const screen = await render(() =>
      h('div', { style: 'padding: 2rem; inline-size: 300px' }, [
        h(InputNumber, { modelValue: 1, size }),
      ]),
    )
    const field = rect(screen.container.querySelector('.ui-input')!)
    const [inc, dec] = screen.container.querySelectorAll('.ui-input-number-stepper')
    const top = field.top + 1
    const bottom = field.bottom - 1
    const mid = (top + bottom) / 2
    const { left, right } = rect(inc!)
    expect(right - left).toBeGreaterThanOrEqual(24)
    // Clear of the rounded corners, which hit testing honours.
    expect(owns(inc!, left + 3, top, right - 3, mid)).toEqual([])
    expect(owns(dec!, left + 3, mid, right - 3, bottom)).toEqual([])
    // The two arrows still sit 2px apart around the field's middle.
    const upArrow = rect(inc!.querySelector('svg')!)
    const downArrow = rect(dec!.querySelector('svg')!)
    expect(downArrow.top - upArrow.bottom).toBeCloseTo(2, 0)
    expect((upArrow.bottom + downArrow.top) / 2).toBeCloseTo(mid, 0)
  })
}
