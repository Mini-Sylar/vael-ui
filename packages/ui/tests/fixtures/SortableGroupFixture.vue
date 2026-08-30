<template>
  <div style="display: flex; gap: 24px">
    <Sortable
      v-model:items="todo"
      item-key="id"
      label-key="label"
      :group="board"
      group-id="todo"
      style="width: 160px"
    >
      <template #item="{ item }">
        <span :data-testid="`label-${item.id}`">{{ item.label }}</span>
      </template>
    </Sortable>
    <Sortable
      v-model:items="doing"
      item-key="id"
      label-key="label"
      :group="board"
      group-id="doing"
      style="width: 160px"
    >
      <template #item="{ item }">
        <span :data-testid="`label-${item.id}`">{{ item.label }}</span>
      </template>
    </Sortable>
  </div>
  <output data-testid="todo-order">{{ todo.map((i) => i.id).join(',') }}</output>
  <output data-testid="doing-order">{{ doing.map((i) => i.id).join(',') }}</output>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Sortable from '../../src/components/Sortable/Sortable.vue'
import { useSortableGroup } from '../../src/composables/useSortableGroup'
import type { GroupDropDetails } from '../../src/composables/useSortableGroup'

const props = withDefaults(
  defineProps<{
    canDrop?: (d: GroupDropDetails) => boolean
    beforeDrop?: (d: GroupDropDetails) => boolean | Promise<boolean>
  }>(),
  { canDrop: undefined, beforeDrop: undefined },
)

const todo = ref([
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
])
const doing = ref([{ id: 'c', label: 'Charlie' }])
const lists = { todo, doing }

const board = useSortableGroup({
  onTransfer: (value, from, to) => {
    const source = lists[from.groupId as keyof typeof lists]
    const dest = lists[to.groupId as keyof typeof lists]
    const [moved] = source.value.splice(from.index, 1)
    dest.value.splice(to.index, 0, moved!)
  },
  canDrop: (details) => props.canDrop?.(details) ?? true,
  beforeDrop: props.beforeDrop ? (details) => props.beforeDrop!(details) : undefined,
})

defineExpose({ todo, doing })
</script>
