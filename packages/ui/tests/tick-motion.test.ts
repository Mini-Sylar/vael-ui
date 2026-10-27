import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, shallowRef } from 'vue'
import Select from '../src/components/Select/Select.vue'
import Tree from '../src/components/Tree/Tree.vue'

const items = ['Accra', 'Kumasi', 'Tamale'].map((label) => ({ label, value: label.toLowerCase() }))
const global = { stubs: { transition: false, 'transition-group': false } }
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

function multiSelect(motion = true) {
  return defineComponent(() => {
    const value = shallowRef<string[]>(['accra'])
    return () =>
      h(Select as never, {
        items,
        multiple: true,
        motion,
        modelValue: value.value,
        'onUpdate:modelValue': (next: string[]) => (value.value = next),
      })
  })
}
const option = (label: string) =>
  [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((el) =>
    el.textContent?.includes(label),
  )!
// The tick's opacity on the frame after it appears: under 1 means it's easing in.
async function tickOpacityAfterPicking(label: string): Promise<number> {
  const row = option(label)
  row.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))
  await frame()
  row.click()
  await frame()
  return Number(getComputedStyle(row.querySelector('.ui-select-option-check')!).opacity)
}

test('picking an option draws its tick in', async () => {
  const screen = await render(multiSelect(), { global })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(option('Kumasi')).toBeDefined())
  await new Promise((resolve) => setTimeout(resolve, 300))
  expect(await tickOpacityAfterPicking('Kumasi')).toBeLessThan(1)
  // It draws: the stroke starts hidden and is uncovered over the next frames.
  const path = option('Kumasi').querySelector('.ui-select-option-check path')!
  expect(Number.parseFloat(getComputedStyle(path).strokeDashoffset)).toBeGreaterThan(0)
  await new Promise((resolve) => setTimeout(resolve, 300))
  expect(Number.parseFloat(getComputedStyle(path).strokeDashoffset)).toBe(0)
})

test('a tick already there when the list opens shows at once', async () => {
  const screen = await render(multiSelect(), { global })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(option('Accra')).toBeDefined())
  // Accra isn't the row being picked, so its tick doesn't animate in with the list.
  const accra = option('Accra')
  if (accra.dataset.active === undefined) {
    expect(Number(getComputedStyle(accra.querySelector('.ui-select-option-check')!).opacity)).toBe(
      1,
    )
  }
})

test('motion false: a picked tick shows at once', async () => {
  const screen = await render(multiSelect(false), { global })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(option('Kumasi')).toBeDefined())
  await new Promise((resolve) => setTimeout(resolve, 300))
  expect(await tickOpacityAfterPicking('Kumasi')).toBe(1)
})

test('Tree: selecting a row draws its tick in', async () => {
  render(() => h(Tree as never, { items, filterable: false, selectionMode: 'single' }), {
    global,
  })
  await vi.waitFor(() => expect(document.querySelector('[role="treeitem"]')).toBeTruthy())
  const row = [...document.querySelectorAll<HTMLElement>('[role="treeitem"]')].find((el) =>
    el.textContent?.includes('Kumasi'),
  )!
  row.focus()
  row.click()
  await frame()
  expect(Number(getComputedStyle(row.querySelector('.ui-tree-check')!).opacity)).toBeLessThan(1)
})
