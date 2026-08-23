<template>
  <div class="demo-list">
    <DemoExampleBlock
      v-for="example in examples"
      :key="example.id"
      :name="name"
      :example="example"
      :show-title="examples.length > 1"
    />
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import DemoExampleBlock from './DemoExampleBlock.vue'

export interface DemoExample {
  id: string
  title: string
  vdomComponent: Component | null
  vaporComponent: Component | null
  vdomCode: string
  vaporCode: string
}

defineProps<{
  name: string
  examples: DemoExample[]
}>()
</script>

<style scoped>
.demo-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
</style>
