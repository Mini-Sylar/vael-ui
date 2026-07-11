<template>
  <input data-testid="input" @keydown="onKeydown" />
  <output data-testid="active-index">{{ activeIndex }}</output>
  <output data-testid="active-id">{{ activeId ?? '' }}</output>
  <output data-testid="selected">{{ selected }}</output>
  <output data-testid="active-change-log">{{
    activeChangeLog.map((e) => `${e.index}:${e.atCallTime}`).join(',')
  }}</output>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { useListbox } from '../../src/composables/useListbox'

const items = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry']
const disabledItems = new Set(['Cherry'])
const selected = shallowRef('')
const activeChangeLog = shallowRef<{ index: number; atCallTime: number }[]>([])

const { activeIndex, activeId, onKeydown, setActive, optionId } = useListbox<string>({
  items,
  getLabel: (item) => item,
  isDisabled: (item) => disabledItems.has(item),
  onSelect: (item) => {
    selected.value = item
  },
  onActiveChange: (index) => {
    // Records activeIndex.value AT CALL TIME — must still be the OLD value,
    // since onActiveChange fires before activeIndex flips (so a virtualized
    // consumer can scrollToIndex the row into the DOM before
    // aria-activedescendant is asked to reference its id).
    activeChangeLog.value = [...activeChangeLog.value, { index, atCallTime: activeIndex.value }]
  },
  listboxId: 'test-listbox',
})

defineExpose({ setActive, optionId, activeIndex })
</script>
