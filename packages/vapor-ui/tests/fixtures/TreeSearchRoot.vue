<template>
  <TreeSelect v-model="value" :items="items" />
</template>

<script setup lang="ts" vapor>
// Built dist import, not source: Vapor's Transition is what this checks.
import { ref } from 'vue'
import { TreeSelect } from 'vael-ui/vapor'

const value = ref<string | null>(null)
const items = [
  {
    label: 'src',
    value: 'src',
    children: [
      {
        label: 'components',
        value: 'components',
        children: [{ label: 'Input.vue', value: 'input' }],
      },
      { label: 'index.ts', value: 'index' },
    ],
  },
  { label: 'package.json', value: 'package' },
  { label: 'README.md', value: 'readme' },
]
</script>
