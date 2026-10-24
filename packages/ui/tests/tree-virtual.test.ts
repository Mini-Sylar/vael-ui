import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import Tree from '../src/components/Tree/Tree.vue'
import type { TreeNode } from '../src/components/Tree/Tree.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'

// Past 500 visible rows a tree is a flat list that renders only the rows in view.
function items(folders = 40, perFolder = 50): TreeNode[] {
  return Array.from({ length: folders }, (_, f) => ({
    label: `Folder ${f}`,
    value: `f${f}`,
    children: Array.from({ length: perFolder }, (_, c) => ({
      label: `Item ${f}-${c}`,
      value: `f${f}-${c}`,
    })),
  }))
}
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const rows = () => [...document.querySelectorAll<HTMLElement>('[role="treeitem"]')]
const row = (value: string) =>
  document.querySelector<HTMLElement>(`[role="treeitem"][data-tree-value="${value}"]`)
const list = () => document.querySelector<HTMLElement>('.ui-tree-list')!

type TreeApi = {
  expandAll: () => void
  collapseNode: (v: string) => void
  expandNode: (v: string) => void
}

async function renderTree(props: Record<string, unknown> = {}, height = '400px', wrap?: object) {
  const tree = shallowRef<TreeApi | null>(null)
  const node = () =>
    h('div', { style: height ? { blockSize: height, display: 'flex' } : undefined }, [
      h(Tree as never, {
        items: items(),
        ref: (el: unknown) => (tree.value = el as TreeApi),
        ...props,
      }),
    ])
  await render(() => (wrap ? h(ConfigProvider as never, wrap, () => node()) : node()))
  await vi.waitFor(() => expect(rows().length).toBeGreaterThan(0))
  tree.value!.expandAll()
  await vi.waitFor(() => expect(document.querySelector('.ui-tree-rows--virtual')).not.toBeNull())
  await frame()
  return tree.value!
}

test('a 2,040-row tree renders only the rows in view, and says where each sits', async () => {
  await renderTree()
  // About a dozen rows fit 400px; overscan adds a few each way. Far from 2,040.
  expect(rows().length).toBeLessThan(40)
  const first = row('f0')!
  expect(first.getAttribute('aria-level')).toBe('1')
  expect(first.getAttribute('aria-setsize')).toBe('40')
  expect(first.getAttribute('aria-posinset')).toBe('1')
  const child = row('f0-2')!
  expect(child.getAttribute('aria-level')).toBe('2')
  expect(child.getAttribute('aria-posinset')).toBe('3')
  expect(child.getAttribute('aria-setsize')).toBe('50')
  // The block is as tall as every row, so the scrollbar is the whole tree's.
  expect(list().scrollHeight).toBeGreaterThan(2040 * 30)
})

test('scrolling renders the rows that come into view', async () => {
  await renderTree()
  list().scrollTop = 1000 * 33
  await vi.waitFor(() => expect(rows().some((el) => el.dataset.treeValue === 'f19-30')).toBe(true))
  expect(row('f0')).toBeNull()
  expect(rows().length).toBeLessThan(40)
})

test('End and Home reach the last and first rows of the whole tree, and arrows move one row', async () => {
  await renderTree()
  row('f0')!.focus()
  await userEvent.keyboard('{End}')
  await vi.waitFor(() =>
    expect(document.activeElement?.getAttribute('data-tree-value')).toBe('f39-49'),
  )
  await userEvent.keyboard('{ArrowUp}')
  await vi.waitFor(() =>
    expect(document.activeElement?.getAttribute('data-tree-value')).toBe('f39-48'),
  )
  await userEvent.keyboard('{Home}')
  await vi.waitFor(() => expect(document.activeElement?.getAttribute('data-tree-value')).toBe('f0'))
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() =>
    expect(document.activeElement?.getAttribute('data-tree-value')).toBe('f0-0'),
  )
})

test('the focused row stays in the page while the list scrolls away from it', async () => {
  await renderTree()
  row('f0-1')!.focus()
  list().scrollTop = 1500 * 33
  await vi.waitFor(() => expect(row('f30-0') ?? row('f29-40') ?? rows()[5]).toBeTruthy())
  await frame()
  expect(row('f0-1')).not.toBeNull()
  expect(document.activeElement).toBe(row('f0-1'))
})

test('a folder in a large tree folds shut with its spring, and the rows below follow', async () => {
  // A small first folder, so the row below it is in view.
  const small = {
    label: 'Small',
    value: 's',
    children: Array.from({ length: 5 }, (_, c) => ({ label: `Small ${c}`, value: `s${c}` })),
  }
  await renderTree({ items: [small, ...items()] })
  const below = () => row('f0')!
  const before = below().getBoundingClientRect().top
  row('s')!.querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  await nextTick()
  await frame()
  await frame()
  // Partway: the next folder has moved up some, not all the way, and its shift is written.
  const partway = below().getBoundingClientRect().top
  expect(partway).toBeLessThan(before)
  expect(
    Number.parseFloat(
      (below().parentElement as HTMLElement).style.getPropertyValue('--ui-tree-shift'),
    ),
  ).toBeGreaterThan(0)
  // Settled: the small folder's rows are gone and the next folder sits right under it.
  await vi.waitFor(() => expect(row('s0')).toBeNull(), { timeout: 2000 })
  const folder = row('s')!.getBoundingClientRect()
  expect(below().getBoundingClientRect().top).toBeGreaterThan(folder.bottom - 1)
  expect(below().getBoundingClientRect().top).toBeLessThan(folder.bottom + 4)
  expect(below().getBoundingClientRect().top).toBeLessThan(partway)
})

test('a folder in a large tree folds open with its spring, clipped as it grows', async () => {
  const tree = await renderTree()
  tree.collapseNode('f0')
  await vi.waitFor(() => expect(row('f0-0')).toBeNull(), { timeout: 2000 })
  row('f0')!.querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  await nextTick()
  await frame()
  await frame()
  // Its rows are there, the later ones still clipped, and the next folder hasn't reached its place.
  expect(row('f0-0')).not.toBeNull()
  const clipped = rows().filter((el) => el.dataset.treeValue?.startsWith('f0-'))
  expect(
    clipped.some((el) => (el.parentElement as HTMLElement).style.clipPath.startsWith('inset')),
  ).toBe(true)
  await vi.waitFor(
    () => expect((row('f0-0')!.parentElement as HTMLElement).style.clipPath).toBe(''),
    { timeout: 2000 },
  )
})

test('with motion off, a large tree opens and closes folders at once', async () => {
  await renderTree({ motion: false })
  row('f0')!.querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  await nextTick()
  await frame()
  expect(row('f0-0')).toBeNull()
})

test('sticky scroll pins the folder being scrolled through, as a copy screen readers skip', async () => {
  await renderTree({ stickyScroll: true })
  list().scrollTop = 20 * 33
  await vi.waitFor(() => expect(document.querySelector('.ui-tree-pin')).not.toBeNull())
  const pin = document.querySelector<HTMLElement>('.ui-tree-pin [data-tree-pinned]')!
  expect(pin.textContent).toContain('Folder 0')
  expect(pin.getAttribute('aria-hidden')).toBe('true')
  expect(pin.getAttribute('role')).toBeNull()
  // It sits at the top of the list, over the rows scrolling under it.
  expect(
    Math.abs(pin.getBoundingClientRect().top - list().getBoundingClientRect().top),
  ).toBeLessThan(2)
})

test('clicking a row in a large tree selects it', async () => {
  const value = shallowRef<string | null>(null)
  await renderTree({
    modelValue: value.value,
    'onUpdate:modelValue': (v: string) => (value.value = v),
  })
  row('f0-3')!.click()
  await vi.waitFor(() => expect(value.value).toBe('f0-3'))
})

test('a tree that grows past 500 rows switches to the flat list and keeps focus on its row', async () => {
  await render(() =>
    h('div', { style: { blockSize: '400px', display: 'flex' } }, [
      h(Tree as never, { items: items(12, 50) }),
    ]),
  )
  await vi.waitFor(() => expect(rows().length).toBe(12))
  // Opening ten folders keeps it nested (510 rows is past 500, so stop at nine: 459).
  for (let f = 0; f < 9; f++) row(`f${f}`)!.querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  await vi.waitFor(() => expect(rows().length).toBe(12 + 9 * 50))
  expect(document.querySelector('.ui-tree-rows--virtual')).toBeNull()
  row('f9')!.focus()
  row('f9')!.querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  await vi.waitFor(() => expect(document.querySelector('.ui-tree-rows--virtual')).not.toBeNull())
  await vi.waitFor(() => expect(document.activeElement).toBe(row('f9')))
})

test('a page-scrolled tree with no height of its own renders only what the window shows', async () => {
  await renderTree({}, '')
  expect(rows().length).toBeLessThan(60)
})

// The fold follows the motion system: the tree's `motion`, the style's `tree` key, the app spring.
async function maxOvershoot(props: Record<string, unknown>, wrap?: object) {
  await render(() => {
    const tree = h(Tree as never, {
      items: [
        {
          label: 'Open me',
          value: 'a',
          children: [
            { label: 'One', value: 'a1' },
            { label: 'Two', value: 'a2' },
          ],
        },
        { label: 'Next', value: 'b' },
      ],
      ...props,
    })
    return wrap ? h(ConfigProvider as never, wrap, () => tree) : tree
  })
  await vi.waitFor(() => expect(row('a')).not.toBeNull())
  row('a')!.querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  let tallest = 0
  const start = performance.now()
  while (performance.now() - start < 900) {
    const block = row('a')!.parentElement!.querySelector<HTMLElement>('.ui-tree-rows')
    if (block?.style.blockSize)
      tallest = Math.max(tallest, Number.parseFloat(block.style.blockSize))
    await frame()
  }
  const settled = row('a')!.parentElement!.querySelector<HTMLElement>('.ui-tree-rows')!
  return tallest - settled.getBoundingClientRect().height
}

test('by default a folder opens without overshooting', async () => {
  expect(await maxOvershoot({})).toBeLessThan(0.5)
})

test("the app's bouncy spring makes a folder overshoot as it opens", async () => {
  expect(
    await maxOvershoot({}, { motion: { spring: { damping: 0.4, response: 0.3 } } }),
  ).toBeGreaterThan(2)
})

test("a style's tree spring beats the app's, and the tree's own motion beats both", async () => {
  const style = {
    motion: {
      version: 1,
      spring: { damping: 0.4, response: 0.3 },
      tree: { spring: { damping: 1, response: 0.3 } },
    },
  }
  expect(await maxOvershoot({}, style)).toBeLessThan(0.5)
  document.body.innerHTML = ''
  expect(
    await maxOvershoot({ motion: { spring: { damping: 0.4, response: 0.3 } } }, style),
  ).toBeGreaterThan(2)
})

test("in a large tree too, the app's bouncy spring carries the rows below past their place and back", async () => {
  const small = {
    label: 'Small',
    value: 's',
    children: Array.from({ length: 5 }, (_, c) => ({ label: `Small ${c}`, value: `s${c}` })),
  }
  const tree = await renderTree({ items: [small, ...items()] }, '400px', {
    motion: { spring: { damping: 0.4, response: 0.3 } },
  })
  tree.collapseNode('s')
  await vi.waitFor(() => expect(row('s0')).toBeNull(), { timeout: 2000 })
  row('s')!.querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  let lowest = 0
  const start = performance.now()
  while (performance.now() - start < 900) {
    const shift = Number.parseFloat(
      (row('f0')!.parentElement as HTMLElement).style.getPropertyValue('--ui-tree-shift') || '0',
    )
    lowest = Math.min(lowest, shift)
    await frame()
  }
  // A negative shift: the row below went further down than where it settles.
  expect(lowest).toBeLessThan(-2)
})
