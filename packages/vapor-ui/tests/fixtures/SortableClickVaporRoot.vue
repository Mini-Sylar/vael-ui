<template>
  <Sortable v-model:items="cards" handle="item" variant="plain" class="cards">
    <template #item="{ item }">
      <button class="open" @click="log.push(`open:${item.value}`)">{{ item.label }}</button>
    </template>
  </Sortable>
  <Sortable v-model:items="rows" class="rows">
    <template #handle="{ item }">
      <span class="grip" @click="log.push(`grip:${item.value}`)">⋮</span>
    </template>
  </Sortable>
  <output class="log">{{ log.join(',') }}</output>
</template>

<script setup lang="ts" vapor>
import { reactive, ref } from 'vue'
import { Sortable } from 'vael-ui/vapor'

const cards = ref([
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
])
const rows = ref([{ value: 'x', label: 'X' }])
const log = reactive<string[]>([])
</script>
