import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import Select from '../src/components/Select/Select.vue'
import Tree from '../src/components/Tree/Tree.vue'
import TreeSelectFixture from './fixtures/TreeSelectFixture.vue'
import CascadeSelectFixture from './fixtures/CascadeSelectFixture.vue'

const global = { stubs: { transition: false, 'transition-group': false } }
const items = ['Accra', 'Kumasi', 'Tamale', 'Lagos', 'Abuja', 'Nairobi'].map((label) => ({
  label,
  value: label.toLowerCase(),
}))

test('narrowing a search eases the list to its new height instead of jumping', async () => {
  const screen = await render(() => h(Select as never, { items, filter: true, modelValue: null }), {
    global,
  })
  await screen.getByRole('combobox').click()
  const list = await vi.waitFor(() => {
    const el = document.querySelector<HTMLElement>('[role="listbox"]')
    expect(el?.querySelectorAll('[role="option"]').length).toBe(6)
    return el!
  })
  await new Promise((resolve) => setTimeout(resolve, 300))
  const heights: number[] = []
  const t0 = performance.now()
  const sample = () => {
    heights.push(list.getBoundingClientRect().height)
    if (performance.now() - t0 < 500) requestAnimationFrame(sample)
  }
  requestAnimationFrame(sample)
  await userEvent.keyboard('nai')
  await new Promise((resolve) => setTimeout(resolve, 550))
  const start = heights[0]!
  const end = heights.at(-1)!
  expect(end).toBeLessThan(start - 20)
  // It passes through heights in between rather than snapping.
  expect(heights.filter((value) => value < start - 1 && value > end + 1).length).toBeGreaterThan(1)
  // And settles with nothing left over.
  expect(list.style.blockSize).toBe('')
  expect(list.dataset.resizing).toBeUndefined()
})

// Samples every frame until 300ms after the last key: under load typing alone can outlast a
// fixed window, which ended the samples before the list changed.
async function heightsWhileTyping(list: HTMLElement, text: string): Promise<number[]> {
  const heights: number[] = []
  let typedAt = Infinity
  const sample = () => {
    heights.push(list.getBoundingClientRect().height)
    if (performance.now() - typedAt < 300) requestAnimationFrame(sample)
    else if (typedAt === Infinity) requestAnimationFrame(sample)
  }
  requestAnimationFrame(sample)
  await userEvent.keyboard(text)
  typedAt = performance.now()
  await new Promise((resolve) => setTimeout(resolve, 550))
  return heights
}
function expectEased(heights: number[]) {
  const start = heights[0]!
  const end = heights.at(-1)!
  expect(Math.abs(end - start)).toBeGreaterThan(20)
  const low = Math.min(start, end)
  const high = Math.max(start, end)
  expect(heights.filter((value) => value > low + 1 && value < high - 1).length).toBeGreaterThan(1)
}

test('TreeSelect: searching eases the tree to its new height', async () => {
  const screen = await render(TreeSelectFixture, { global })
  await screen.getByRole('combobox').click()
  const tree = await vi.waitFor(() => {
    const el = document.querySelector<HTMLElement>('.ui-tree-select-panel [role="tree"]')
    expect(el).toBeTruthy()
    return el!
  })
  await new Promise((resolve) => setTimeout(resolve, 300))
  document.querySelector<HTMLInputElement>('.ui-tree-select-panel input')!.focus()
  // From two folders to the matches inside them, folders opened.
  expectEased(await heightsWhileTyping(tree, 'o'))
  expect(tree.style.blockSize).toBe('')
})

test('CascadeSelect: searching eases the menu to its new height', async () => {
  const screen = await render(CascadeSelectFixture, { props: { filter: true }, global })
  await screen.getByRole('combobox').click()
  const menu = await vi.waitFor(() => {
    const el = document.querySelector<HTMLElement>('[role="menu"]')
    expect(document.activeElement?.closest('.ui-cascade-select-filter')).toBeTruthy()
    return el!
  })
  await new Promise((resolve) => setTimeout(resolve, 300))
  // From two top-level rows to every matching city, then settled.
  expectEased(await heightsWhileTyping(menu, 'a'))
  expect(menu.style.blockSize).toBe('')
})

const folders = [
  { label: 'Fruits', value: 'fruits', children: ['Apple', 'Orange', 'Mango', 'Lemon'] },
  { label: 'Vegetables', value: 'vegetables', children: ['Carrot', 'Potato', 'Onion', 'Leek'] },
].map((folder) => ({
  ...folder,
  children: folder.children.map((label) => ({ label, value: label.toLowerCase() })),
}))

test('Tree on its own: searching eases the list to its new height', async () => {
  render(() => h(Tree as never, { items: folders, filterable: true }), { global })
  const tree = await vi.waitFor(() => {
    const el = document.querySelector<HTMLElement>('[role="tree"]')
    expect(el).toBeTruthy()
    return el!
  })
  await new Promise((resolve) => setTimeout(resolve, 300))
  document.querySelector<HTMLInputElement>('.ui-tree-filter input')!.focus()
  expectEased(await heightsWhileTyping(tree, 'o'))
  expect(tree.style.blockSize).toBe('')
})

// Nothing between the old height and the new one.
function expectInstant(heights: number[]) {
  const start = heights[0]!
  const end = heights.at(-1)!
  expect(Math.abs(end - start)).toBeGreaterThan(20)
  const low = Math.min(start, end)
  const high = Math.max(start, end)
  expect(heights.filter((value) => value > low + 1 && value < high - 1)).toHaveLength(0)
}

test('motion false: a Select search resizes the list at once', async () => {
  const screen = await render(
    () => h(Select as never, { items, filter: true, modelValue: null, motion: false }),
    { global },
  )
  await screen.getByRole('combobox').click()
  const list = await vi.waitFor(() => {
    const el = document.querySelector<HTMLElement>('[role="listbox"]')
    expect(el?.querySelectorAll('[role="option"]').length).toBe(6)
    return el!
  })
  await new Promise((resolve) => setTimeout(resolve, 300))
  expectInstant(await heightsWhileTyping(list, 'nai'))
})

test('motion false: a Tree search resizes the list and swaps its folders at once', async () => {
  render(() => h(Tree as never, { items: folders, filterable: true, motion: false }), {
    global,
  })
  const tree = await vi.waitFor(() => {
    const el = document.querySelector<HTMLElement>('[role="tree"]')
    expect(el).toBeTruthy()
    return el!
  })
  await new Promise((resolve) => setTimeout(resolve, 300))
  const input = document.querySelector<HTMLInputElement>('.ui-tree-filter input')!
  input.focus()
  expectInstant(await heightsWhileTyping(tree, 'o'))
  await userEvent.clear(input)
  await nextTick()
  const shown = [...tree.querySelectorAll<HTMLElement>('.ui-tree-rows')].filter(
    (el) => el.getClientRects().length > 0,
  )
  expect(shown.filter((el) => el.dataset.folding !== undefined)).toHaveLength(0)
})

test('motion false: the clear button goes at once', async () => {
  const Host = defineComponent(() => {
    const value = shallowRef<string | null>('accra')
    return () =>
      h(Select as never, {
        items,
        clearable: true,
        motion: false,
        modelValue: value.value,
        'onUpdate:modelValue': (next: string | null) => (value.value = next),
      })
  })
  render(Host, { global })
  const clear = await vi.waitFor(() => {
    const el = document.querySelector<HTMLElement>('.ui-select-clear')
    expect(el).toBeTruthy()
    return el!
  })
  clear.click()
  await nextTick()
  expect(document.querySelector('.ui-select-clear')).toBeNull()
})
