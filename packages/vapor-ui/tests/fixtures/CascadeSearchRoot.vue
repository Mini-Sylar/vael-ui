<template>
  <CascadeSelect v-model="value" :items="items" filter :ui="{ panel: 'geo-panel' }" />
  <output data-testid="value">{{ value ?? '' }}</output>
</template>

<script setup lang="ts" vapor>
// Built dist import, not source: the search box sits in Menu's header in the Vapor build.
import { ref } from 'vue'
import { CascadeSelect } from 'vael-ui/vapor'

const value = ref<string | null>(null)
const items = [
  {
    label: 'Africa',
    value: 'africa',
    children: [
      {
        label: 'Ghana',
        value: 'gh',
        children: [
          { label: 'Accra', value: 'accra' },
          { label: 'Kumasi', value: 'kumasi' },
        ],
      },
    ],
  },
]
</script>
