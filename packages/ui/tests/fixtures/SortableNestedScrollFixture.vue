<template>
  <div data-testid="outer" style="height: 200px; overflow-y: auto; width: 240px">
    <div data-testid="inner" style="height: 240px; overflow-y: auto">
      <Sortable
        v-model:items="items"
        item-key="id"
        label-key="label"
        :auto-scroll="false"
        :motion-css="false"
      >
        <template #item="{ item }">
          <span style="display: block; height: 24px">{{ item.label }}</span>
        </template>
      </Sortable>
    </div>
    <div style="height: 300px" />
  </div>
  <output data-testid="order">{{ items.map((i) => i.id).join(',') }}</output>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Sortable from '../../src/components/Sortable/Sortable.vue'

const items = ref(Array.from({ length: 20 }, (_, i) => ({ id: `r${i}`, label: `Row ${i}` })))
</script>
