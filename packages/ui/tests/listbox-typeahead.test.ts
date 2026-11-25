import { effectScope } from 'vue'
import { expect, test } from 'vitest'
import { useListbox } from '../src/composables/useListbox'

test('typing more letters searches from the active option, so "sa" lands on Save, not Save as', () => {
  const scope = effectScope()
  const listbox = scope.run(() =>
    useListbox({
      items: ['Open', 'Save', 'Save as'],
      getLabel: (item) => item,
      onSelect: () => {},
      listboxId: 'lb',
    }),
  )!
  listbox.setActive(0)
  for (const key of 'sa') listbox.onKeydown(new KeyboardEvent('keydown', { key }))
  expect(listbox.activeIndex.value).toBe(1)
  scope.stop()
})

test('the arrow keys skip disabled options and wrap at the ends', () => {
  const scope = effectScope()
  const listbox = scope.run(() =>
    useListbox({
      items: ['A', 'B', 'C', 'D'],
      getLabel: (item) => item,
      isDisabled: (item) => item === 'B' || item === 'D',
      onSelect: () => {},
      listboxId: 'lb',
    }),
  )!
  const press = (key: string) => {
    listbox.onKeydown(new KeyboardEvent('keydown', { key }))
    return listbox.activeIndex.value
  }
  // Nothing active: down starts at the first enabled option, up at the last.
  expect(press('ArrowDown')).toBe(0)
  expect(press('ArrowDown')).toBe(2)
  expect(press('ArrowDown')).toBe(0)
  expect(press('ArrowUp')).toBe(2)
  // A disabled option set active counts as none.
  listbox.setActive(3)
  expect(press('ArrowUp')).toBe(2)
  listbox.setActive(-1)
  expect(press('ArrowUp')).toBe(2)
  scope.stop()
})
