<template>
  <Select v-model="value" :items="items" placeholder="Office" />
</template>

<script setup lang="ts" vapor>
// Built dist import, not source: grouped rendering goes through the Vapor-compiled list body.
import { ref } from 'vue'
import { Select } from 'vael-ui/vapor'

const value = ref<string | null>(null)
const items = [
  { label: 'Remote', value: 'remote' },
  {
    label: 'Ghana',
    items: [
      { label: 'Accra', value: 'accra' },
      { label: 'Kumasi', value: 'kumasi' },
    ],
  },
]
</script>
