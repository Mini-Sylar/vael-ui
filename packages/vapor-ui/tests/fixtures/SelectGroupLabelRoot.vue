<template>
  <Select v-model="value" :items="items" placeholder="Office" :ui="{ group: 'office-group' }">
    <template #group-label="{ group, items: shown }">
      <span aria-hidden="true">{{ group.flag }}</span> {{ group.label }} · {{ shown.length }}
    </template>
    <template #item="{ item, group }">{{ item.label }} ({{ group?.flag ?? 'none' }})</template>
  </Select>
</template>

<script setup lang="ts" vapor>
// Built dist import, not source: the slot crosses Select into the Vapor-compiled list body.
import { ref } from 'vue'
import { Select } from 'vael-ui/vapor'

const value = ref<string | null>(null)
const items = [
  { label: 'Remote', value: 'remote' },
  {
    label: 'Ghana',
    flag: '🇬🇭',
    items: [
      { label: 'Accra', value: 'accra' },
      { label: 'Kumasi', value: 'kumasi' },
    ],
  },
]
</script>
