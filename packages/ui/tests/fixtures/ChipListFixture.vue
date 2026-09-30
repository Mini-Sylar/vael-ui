<template>
  <div data-testid="list">
    <Chip v-for="item in items" :key="item" :label="item" removable @remove="remove(item)" />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Chip from '../../src/components/Chip/Chip.vue'

const items = shallowRef(['A', 'B', 'C'])

function remove(item: string) {
  items.value = items.value.filter((i) => i !== item)
}
</script>
