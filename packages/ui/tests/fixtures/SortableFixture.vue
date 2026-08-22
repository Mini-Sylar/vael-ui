<template>
  <Sortable
    v-model:items="items"
    item-key="id"
    label-key="label"
    :disabled="disabled"
    :motion-css="motionCss"
    :axis="axis"
    :can-drop="canDrop"
    :before-drop="beforeDrop"
    @drop-error="onDropError"
  >
    <template #item="{ item }">
      <span :data-testid="`label-${item.id}`">{{ item.label }}</span>
    </template>
  </Sortable>
  <output data-testid="order">{{ items.map((i) => i.id).join(',') }}</output>
  <output data-testid="drop-errors">{{ dropErrors.join('|') }}</output>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Sortable from '../../src/components/Sortable/Sortable.vue'
import type { SortableDropDetails } from '../../src/composables/useSortable'

withDefaults(
  defineProps<{
    disabled?: boolean
    motionCss?: boolean
    axis?: 'x' | 'y'
    canDrop?: (d: SortableDropDetails) => boolean
    beforeDrop?: (d: SortableDropDetails) => boolean | Promise<boolean>
  }>(),
  { disabled: false, motionCss: true, axis: 'y', canDrop: undefined, beforeDrop: undefined },
)

const dropErrors = ref<string[]>([])
function onDropError(error: unknown) {
  dropErrors.value.push(String((error as Error)?.message ?? error))
}

const items = ref([
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
  { id: 'c', label: 'Charlie' },
])
defineExpose({ items, dropErrors })
</script>
