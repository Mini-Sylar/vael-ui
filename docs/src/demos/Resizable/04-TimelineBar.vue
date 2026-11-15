<template>
  <section class="demo">
    <h3>A timeline bar: two ends and a move</h3>
    <p class="note">
      Two <code>useResizable</code> over the same <code>offset</code> and size make a bar: pull
      either end, or drag the bar itself to move it. The drag stays smooth and snaps to a day on
      release; Escape puts it back; near the edge the timeline scrolls. Focus an end or the bar and
      use the arrow keys for a day at a time.
    </p>
    <div ref="scroller" class="timeline">
      <div class="track" :style="{ inlineSize: `${DAYS * DAY}px` }">
        <div
          class="bar"
          :class="{ 'is-live': startEnd.isDragging.value || endEnd.isDragging.value }"
          :style="{ insetInlineStart: `${start}px`, inlineSize: `${size}px` }"
          role="group"
          :aria-label="`Launch, ${label}`"
          tabindex="0"
          @pointerdown="endEnd.onMovePointerdown"
          @keydown="endEnd.onMoveKeydown"
        >
          <span
            class="end is-start"
            role="separator"
            aria-label="Start date"
            tabindex="0"
            @pointerdown.stop="startEnd.onHandlePointerdown"
            @keydown.stop="startEnd.onHandleKeydown"
          />
          Launch
          <span
            class="end is-end"
            role="separator"
            aria-label="End date"
            tabindex="0"
            @pointerdown.stop="endEnd.onHandlePointerdown"
            @keydown.stop="endEnd.onHandleKeydown"
          />
        </div>
      </div>
    </div>
    <p class="status">{{ label }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { useResizable } from 'vael-ui'

const DAY = 28
const DAYS = 60
const scroller = useTemplateRef<HTMLElement>('scroller')
const start = shallowRef(4 * DAY)
const size = shallowRef(10 * DAY)

const shared = {
  offset: start,
  bounds: [0, DAYS * DAY] as [number, number],
  step: DAY,
  min: DAY,
  scrollEl: scroller,
}
const startEnd = useResizable(size, { ...shared, edge: 'start' })
const endEnd = useResizable(size, { ...shared, edge: 'end' })

// The days it covers, rounded live: the drag itself isn't stepped.
const label = computed(() => {
  const from = Math.round(start.value / DAY) + 1
  const to = Math.round((start.value + size.value) / DAY)
  return `Day ${from} to day ${to}, ${to - from + 1} days`
})
</script>

<style scoped>
.timeline {
  overflow-x: auto;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.track {
  position: relative;
  block-size: 3.5rem;
  background-image: linear-gradient(to right, var(--ui-border) 1px, transparent 1px);
  background-size: 28px 100%;
}
.bar {
  position: absolute;
  inset-block: 0.75rem;
  display: flex;
  align-items: center;
  padding-inline: 0.75rem;
  border-radius: 0.375rem;
  background: var(--ui-primary);
  color: var(--ui-primary-contrast);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: grab;
  touch-action: none;
  user-select: none;
  /* Eases onto the day it snapped to; never while it follows the pointer. */
  transition:
    inset-inline-start var(--ui-duration-enter, 160ms) var(--ui-ease-out),
    inline-size var(--ui-duration-enter, 160ms) var(--ui-ease-out);
}
.bar.is-live {
  cursor: grabbing;
  transition: none;
}
.bar:focus-visible,
.end:focus-visible {
  outline: 2px solid var(--ui-text);
  outline-offset: 2px;
}
.end {
  position: absolute;
  inset-block: 0;
  inline-size: 10px;
  cursor: ew-resize;
  touch-action: none;
}
.end.is-start {
  inset-inline-start: -2px;
}
.end.is-end {
  inset-inline-end: -2px;
}
.status {
  margin: 0.5rem 0 0;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}
</style>
