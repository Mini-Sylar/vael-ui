<template>
  <Combobox v-model="value" :items="items" placeholder="Ingredient" :ui="{ group: 'food-group' }">
    <template #group-label="{ group, items: shown }"
      >{{ group.label }} · {{ shown.length }}</template
    >
  </Combobox>
</template>

<script setup lang="ts" vapor>
// Built dist import, not source: grouped rendering goes through the Vapor-compiled list body.
import { ref } from 'vue'
import { Combobox } from 'vael-ui/vapor'

const value = ref<string | null>(null)
const items = [
  {
    label: 'Fruit',
    items: [
      { label: 'Apple', value: 'apple' },
      { label: 'Mango', value: 'mango' },
    ],
  },
  { label: 'Herbs', items: [{ label: 'Mint', value: 'mint' }] },
]
</script>
