// Every component with a root element exposes it as `el`, so a ref to it works in Vapor too.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import {
  AccordionItem,
  Accordion,
  Calendar,
  Pagination,
  Select,
  Tabs,
  Tree,
  TreeSelect,
} from '../src'

const cases: [string, () => ReturnType<typeof h>][] = [
  ['Select', () => h(Select as never, { items: ['a'], ariaLabel: 'S', ref: 'c' })],
  [
    'TreeSelect',
    () => h(TreeSelect as never, { items: [{ value: 1, label: 'a' }], ariaLabel: 'T', ref: 'c' }),
  ],
  ['Calendar', () => h(Calendar as never, { ref: 'c' })],
  ['Tabs', () => h(Tabs as never, { items: ['a'], ref: 'c' })],
  ['Tree', () => h(Tree as never, { items: [{ value: 1, label: 'a' }], ariaLabel: 'T', ref: 'c' })],
  ['Pagination', () => h(Pagination as never, { total: 30, ref: 'c' })],
]

for (const [name, make] of cases) {
  test(`${name} exposes its root element as el`, async () => {
    const instance = shallowRef<{ el?: unknown; $el?: unknown } | null>(null)
    await render({
      setup: () => () => h(make(), { ref: (r: unknown) => (instance.value = r as never) }),
    } as never)
    const el = instance.value?.el
    expect(el).toBeInstanceOf(HTMLElement)
    expect((el as HTMLElement).isConnected).toBe(true)
  })
}

test('AccordionItem exposes its root element as el', async () => {
  const item = shallowRef<{ el?: unknown } | null>(null)
  await render({
    setup: () => () =>
      h(Accordion as never, null, () =>
        h(AccordionItem as never, {
          value: 'a',
          title: 'A',
          ref: (r: unknown) => (item.value = r as never),
        }),
      ),
  } as never)
  expect(item.value?.el).toBeInstanceOf(HTMLElement)
})
