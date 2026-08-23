<template>
  <section class="demo">
    <h3>Sizing: <code>width</code> and <code>fullScreen</code></h3>
    <p class="note">
      Always flush to the bottom edge regardless of width (via Dialog's <code>flush</code> prop):
      capped widths stay centered. <code>fullScreen</code> collapses to a single takeover snap point
      with unrounded corners, since there's nowhere left to drag up to. Beyond the sm/md/lg scale,
      the <code>ui.panel</code> escape hatch (same one Dialog's blurred-backdrop demo uses) reaches
      the panel class directly for an arbitrary width.
    </p>
    <div class="row">
      <Button variant="outline" @click="widthOpen = 'full'">full</Button>
      <Button variant="outline" @click="widthOpen = 'sm'">sm</Button>
      <Button variant="outline" @click="widthOpen = 'md'">md</Button>
      <Button variant="outline" @click="widthOpen = 'lg'">lg</Button>
      <Button variant="outline" @click="fullScreenOpen = true">fullScreen</Button>
    </div>
    <BottomSheet
      :open="widthOpen !== null"
      :width="widthOpen ?? 'full'"
      title="Notifications"
      aria-label="Notifications"
      @update:open="(v) => !v && (widthOpen = null)"
    >
      <p class="sheet-lede">width="{{ widthOpen }}"</p>
    </BottomSheet>
    <BottomSheet v-model:open="fullScreenOpen" full-screen title="Filters" aria-label="Filters">
      <p class="sheet-lede">A single snap point at 100% height. Drag the handle down to dismiss.</p>
    </BottomSheet>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, BottomSheet } from 'vael-ui'

const widthOpen = shallowRef<'full' | 'sm' | 'md' | 'lg' | null>(null)
const fullScreenOpen = shallowRef(false)
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
