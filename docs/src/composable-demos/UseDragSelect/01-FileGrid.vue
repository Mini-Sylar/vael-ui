<template>
  <section class="demo">
    <h3>A file grid</h3>
    <p class="note">
      Drag across the empty space to select what the band touches. Shift adds, ctrl or cmd toggles,
      and a click on empty space clears. Near an edge it scrolls.
      {{ dragSelect.selected.value.length }}
      selected.
    </p>
    <Switch v-model="elastic" label="Elastic" />
    <div ref="box" class="files" role="group" aria-label="Files">
      <div
        v-for="(file, i) in files"
        :key="file"
        v-animate="{
          animate: { scale: dragSelect.selected.value.includes(i) ? 0.96 : 1 },
          spring: 'snappy',
        }"
        class="file"
        :class="{ on: dragSelect.selected.value.includes(i) }"
      >
        {{ file }}
      </div>
      <div
        v-if="dragSelect.isDragging.value"
        v-animate="{
          initial: { opacity: 0 },
          animate: {
            opacity: 1,
            x: () => dragSelect.x.value,
            y: () => dragSelect.y.value,
            width: () => dragSelect.width.value,
            height: () => dragSelect.height.value,
          },
          exit: { opacity: 0 },
        }"
        class="band"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Switch, useDragSelect } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

const files = Array.from({ length: 40 }, (_, i) => `File ${i + 1}.pdf`)
const box = useTemplateRef<HTMLElement>('box')
const elastic = shallowRef(true)
const dragSelect = useDragSelect({ el: box, spring: elastic })
</script>

<style scoped>
.files {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
  gap: 0.5rem;
  max-height: 18rem;
  overflow: auto;
  padding: 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
}
.file {
  display: grid;
  place-items: center;
  height: 4.5rem;
  border: 1px solid var(--ui-border);
  border-radius: calc(var(--ui-radius) * 0.7);
  background: var(--ui-bg, transparent);
  font-size: 0.8125rem;
  user-select: none;
}
.file.on {
  border-color: var(--ui-primary);
  background: color-mix(in srgb, var(--ui-primary) 14%, transparent);
}
.band {
  position: absolute;
  inset: 0 auto auto 0;
  border: 1px solid var(--ui-primary);
  border-radius: 4px;
  background: color-mix(in srgb, var(--ui-primary) 12%, transparent);
  pointer-events: none;
}
</style>
