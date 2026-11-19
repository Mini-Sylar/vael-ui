<template>
  <section class="demo">
    <h3>A rubber band</h3>
    <p class="note">
      The corner trails the pointer on a bouncy spring, and the band's sides bow in by its
      <code>stretch</code> as a stretched rubber band pinches, and out when it overshoots.
      {{ dragSelect.selected.value.length }} selected.
    </p>
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
      <svg
        v-if="dragSelect.isDragging.value"
        v-animate="{
          initial: { opacity: 0 },
          animate: { opacity: 1, x: () => dragSelect.x.value, y: () => dragSelect.y.value },
          exit: { opacity: 0 },
        }"
        class="band"
        aria-hidden="true"
      >
        <path :d="outline" />
      </svg>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useDragSelect } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

const files = Array.from({ length: 40 }, (_, i) => `File ${i + 1}.pdf`)
const box = useTemplateRef<HTMLElement>('box')
const dragSelect = useDragSelect({ el: box, spring: 'bouncy' })

// The band's outline: each side a curve whose middle is pulled in by the tension along the other axis.
const outline = computed(() => {
  const { width: w, height: h, stretch } = dragSelect
  const bow = (pull: number, size: number) => Math.max(-size / 3, Math.min(size / 3, pull * 0.3))
  const top = bow(stretch.value.x, h.value)
  const side = bow(stretch.value.y, w.value)
  return `M0 0Q${w.value / 2} ${top} ${w.value} 0Q${w.value - side} ${h.value / 2} ${w.value} ${h.value}Q${w.value / 2} ${h.value - top} 0 ${h.value}Q${side} ${h.value / 2} 0 0Z`
})
</script>

<style scoped>
.files {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
  gap: 0.5rem;
  max-height: 18rem;
  overflow: auto;
  padding: 1.75rem;
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
  width: 1px;
  height: 1px;
  overflow: visible;
  pointer-events: none;
}
.band path {
  fill: color-mix(in srgb, var(--ui-primary) 12%, transparent);
  stroke: var(--ui-primary);
  stroke-width: 1px;
  stroke-linejoin: round;
}
</style>
