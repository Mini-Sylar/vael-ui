<!-- ColorPicker open with every part: the swatch, and a panel with the hex value and presets. -->
<template>
  <div data-specimen class="specimen">
    <ColorPicker
      v-model="color"
      :open="true"
      :presets="presets"
      label="Accent color"
      @update:open="() => {}"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ColorPicker } from 'vael-ui'

const presets = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#18181b']
const color = ref('#4f46e5')
</script>

<style scoped>
.specimen {
  inline-size: min(16rem, 100%);
  min-block-size: 20rem;
}
</style>
