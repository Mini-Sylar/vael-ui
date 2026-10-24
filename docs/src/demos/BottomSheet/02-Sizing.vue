<template>
  <section class="demo">
    <h3>Sizing: <code>width</code> and <code>fullScreen</code></h3>
    <p class="note">
      Every width sits flush with the bottom edge, and <code>sm</code>, <code>md</code> and
      <code>lg</code> center the sheet. <code>fullScreen</code> has one snap point at full height,
      with square corners, since there’s no room left to drag up. For any other width, set a class
      through <code>ui.panel</code>.
    </p>
    <div class="row">
      <Button v-for="size in sizes" :key="size" variant="outline" @click="openAt(size)">
        {{ size }}
      </Button>
      <Button variant="outline" @click="fullScreenOpen = true">fullScreen</Button>
    </div>
    <BottomSheet
      v-model:open="open"
      :width="width"
      title="Notifications"
      aria-label="Notifications"
    >
      <p class="sheet-lede">width="{{ width }}"</p>
    </BottomSheet>
    <BottomSheet v-model:open="fullScreenOpen" full-screen title="Filters" aria-label="Filters">
      <p class="sheet-lede">A single snap point at 100% height. Drag the handle down to dismiss.</p>
    </BottomSheet>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, BottomSheet } from 'vael-ui'

const sizes = ['full', 'sm', 'md', 'lg'] as const
const width = shallowRef<(typeof sizes)[number]>('full')
const open = shallowRef(false)
const fullScreenOpen = shallowRef(false)
function openAt(size: (typeof sizes)[number]) {
  width.value = size
  open.value = true
}
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.sheet-lede {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}
</style>
