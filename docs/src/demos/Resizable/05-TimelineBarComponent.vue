<template>
  <section class="demo">
    <h3>A timeline bar with the component</h3>
    <p class="note">
      <code>edge="both"</code> puts a handle on each end, and <code>v-model:offset</code> sets where
      the bar starts, so it positions itself inside its container. Pull either end, or drag the bar
      to move it. It snaps to a day on release, Escape puts it back, and the timeline scrolls near
      its edges. <code>@commit</code> fires once per settled change.
    </p>
    <div ref="scroller" class="timeline">
      <div class="track" :style="{ inlineSize: `${DAYS * DAY}px` }">
        <Resizable
          v-model:size="size"
          v-model:offset="start"
          edge="both"
          :min="DAY"
          :step="DAY"
          :bounds="[0, DAYS * DAY]"
          :scroll-el="scroller"
          role="group"
          :aria-label="`Launch, ${label}`"
          class="bar"
          @commit="saved = label"
        >
          Launch
        </Resizable>
      </div>
    </div>
    <p class="status">{{ label }}<template v-if="saved"> · saved: {{ saved }}</template></p>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { Resizable } from 'vael-ui'

const DAY = 28
const DAYS = 60
const scroller = useTemplateRef<HTMLElement>('scroller')
const start = shallowRef(4 * DAY)
const size = shallowRef(10 * DAY)
const saved = shallowRef('')

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
  inset-block: 0.75rem;
  display: flex;
  align-items: center;
  padding-inline: 0.75rem;
  border-radius: 0.375rem;
  background: var(--ui-primary);
  color: var(--ui-primary-contrast);
  font-size: 0.8125rem;
  font-weight: 500;
  user-select: none;
}
.bar:focus-visible {
  outline: 2px solid var(--ui-text);
  outline-offset: 2px;
}
.status {
  margin: 0.5rem 0 0;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}
</style>
