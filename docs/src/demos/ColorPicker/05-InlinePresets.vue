<template>
  <section class="demo">
    <h3>Presets beside the trigger</h3>
    <p class="note">
      <code>presets-placement="inline"</code> shows the presets as a row of swatches next to the
      trigger, one click from the common colors. The trigger still opens the panel for any other
      color.
    </p>
    <ColorPicker
      v-model="color"
      :presets="presets"
      presets-placement="inline"
      label="Label color"
    />
    <p class="status">Color: {{ color }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { ColorPicker } from 'vael-ui'

const presets = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']
const color = shallowRef(presets[3])
</script>

<style scoped>
.status {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
