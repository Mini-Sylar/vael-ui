// axe measures the element's box, so a small button inside a trigger is itself 24x24 (WCAG 2.5.8).
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import Select from '../src/components/Select/Select.vue'
import CascadeSelect from '../src/components/CascadeSelect/CascadeSelect.vue'

const items = [
  { label: 'Apple', value: 'a' },
  { label: 'Banana', value: 'b' },
]
const tree = [{ label: 'Fruit', value: 'f', children: items }]

for (const size of ['sm', 'md', 'lg'] as const) {
  test(`${size}: chip removes and clears inside a trigger are 24x24 boxes`, async () => {
    const screen = await render(() =>
      h('div', { style: 'padding: 2rem; inline-size: 320px; display: grid; gap: 2rem' }, [
        h(Select as never, {
          items,
          modelValue: ['a', 'b'],
          multiple: true,
          clearable: true,
          size,
        }),
        h(Select as never, { items, modelValue: 'a', clearable: true, size }),
        h(CascadeSelect as never, {
          items: tree,
          modelValue: ['a', 'b'],
          multiple: true,
          clearable: true,
          size,
        }),
      ]),
    )
    const targets = screen.container.querySelectorAll(
      '.ui-chip-remove, .ui-select-clear, .ui-cascade-select-clear',
    )
    expect(targets.length).toBe(7)
    for (const el of targets) {
      const r = el.getBoundingClientRect()
      expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(24)
      // The painted circle keeps its size.
      expect(parseFloat(getComputedStyle(el, '::before').width)).toBeLessThan(24)
    }
  })
}
