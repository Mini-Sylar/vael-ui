<template>
  <div data-testid="scroller" style="height: 120px; overflow-y: auto; width: 240px">
    <Sortable
      v-model:items="items"
      item-key="id"
      label-key="label"
      :auto-scroll="autoScroll"
      :motion-css="false"
    >
      <template #item="{ item }">
        <span style="display: block; height: 24px">{{ item.label }}</span>
      </template>
    </Sortable>
  </div>
  <output data-testid="order">{{ items.map((i) => i.id).join(',') }}</output>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Sortable from '../../src/components/Sortable/Sortable.vue'

withDefaults(defineProps<{ autoScroll?: boolean }>(), { autoScroll: true })

const items = ref(Array.from({ length: 20 }, (_, i) => ({ id: `r${i}`, label: `Row ${i}` })))
</script>
