<template>
  <section class="demo">
    <h3>Presets in the panel</h3>
    <div class="picker-row">
      <ColorPicker v-model="color" :presets="presets" label="Label color" />
      <span class="demo-status" :style="{ color }">Text in the chosen color</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { ColorPicker } from 'vael-ui'

const presets = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b']
const color = shallowRef(presets[3])
</script>

<style scoped>
.picker-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>
