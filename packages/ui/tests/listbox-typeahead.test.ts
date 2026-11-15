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
