<template>
  <div
    class="throughput"
    tabindex="0"
    role="group"
    aria-label="Merged and opened pull requests per day, last 30 days. Use the arrow keys to read each day."
    @keydown="onKeydown"
    @pointerleave="pinned ? undefined : (index = null)"
  >
    <div class="throughput-grid" aria-hidden="true">
      <span v-for="n in 3" :key="n" />
    </div>
    <DitherArea
      :values="throughput.merged"
      :secondary="throughput.opened"
      :headroom="0.35"
      end-dot
      :delay="0.35"
    />

    <!-- One hover zone per day; also what the autoplay clicks to pin a day. -->
    <div class="throughput-zones" aria-hidden="true">
      <span
        v-for="(_, i) in throughput.merged"
        :key="i"
        :data-day="i"
        @pointerenter="index = i"
        @click="pin(i)"
      />
    </div>

    <template v-if="index !== null">
      <span class="throughput-crosshair" :style="{ left: `${x(index)}%` }" aria-hidden="true" />
      <span
        class="throughput-dot"
        :style="{ left: `${x(index)}%`, top: `${y(index)}%` }"
        aria-hidden="true"
      />
      <div
        class="throughput-tip"
        :data-flip="x(index) > 70 || undefined"
        :style="{ left: `${x(index)}%` }"
        aria-live="polite"
      >
        <span class="throughput-tip-day">{{ throughputDays[index] }}</span>
        <span>
          <span class="throughput-num">{{ throughput.merged[index] }}</span> merged ·
          <span class="throughput-num">{{ throughput.opened[index] }}</span> opened
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import DitherArea from './DitherArea.vue'
import { sparkPaths } from './sparkPath'
import { throughput, throughputDays } from './repoData'

const index = shallowRef<number | null>(null)
const pinned = shallowRef(false)

// Same scale and padding as DitherArea, so the dot sits on its line.
const points = computed(() => {
  const all = [...throughput.merged, ...throughput.opened]
  const min = Math.min(...all)
  const max = Math.max(...all)
  return sparkPaths(throughput.merged, 100, 40, 4, { min: min - (max - min) * 0.35, max }).points
})
const x = (i: number) => points.value[i]!.x
const y = (i: number) => (points.value[i]!.y / 40) * 100

function pin(i: number) {
  index.value = i
  pinned.value = true
}

function onKeydown(event: KeyboardEvent) {
  const last = throughput.merged.length - 1
  const current = index.value ?? last
  const next =
    event.key === 'ArrowLeft'
      ? current - 1
      : event.key === 'ArrowRight'
        ? current + 1
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? last
            : event.key === 'Escape'
              ? null
              : undefined
  if (next === undefined) return
  event.preventDefault()
  pinned.value = next !== null
  index.value = next === null ? null : Math.min(last, Math.max(0, next))
}

defineExpose({
  /** Clears a pinned day. */
  reset: () => {
    index.value = null
    pinned.value = false
  },
})
</script>

<style scoped>
.throughput {
  position: relative;
  block-size: 9.5rem;
  border-radius: calc(var(--ui-radius) - 4px);
  outline-offset: 4px;
}
.throughput:focus-visible {
  outline: 2px solid var(--ui-primary);
}

.throughput-grid {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-block: 0.25rem 0;
  pointer-events: none;
}
.throughput-grid span {
  block-size: 1px;
  background: color-mix(in oklch, var(--ui-border) 60%, transparent);
}

.throughput-zones {
  position: absolute;
  inset: 0;
  display: flex;
}
.throughput-zones span {
  flex: 1 1 0;
  cursor: crosshair;
}

.throughput-crosshair {
  position: absolute;
  inset-block: 0;
  inline-size: 1px;
  background: color-mix(in oklch, var(--ui-text) 22%, transparent);
  pointer-events: none;
  transition: left 90ms var(--ui-ease-out);
}
.throughput-dot {
  position: absolute;
  inline-size: 8px;
  block-size: 8px;
  margin: -4px 0 0 -4px;
  border-radius: 999px;
  background: var(--ui-text);
  box-shadow: 0 0 0 3px var(--ui-surface);
  pointer-events: none;
  transition:
    left 90ms var(--ui-ease-out),
    top 90ms var(--ui-ease-out);
}

/* Dark card in both themes, like a toast: reads as an overlay, not content. */
.throughput-tip {
  position: absolute;
  inset-block-start: 0.25rem;
  margin-inline-start: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.375rem 0.625rem;
  border-radius: calc(var(--ui-radius) - 2px);
  background: #18181b;
  color: #fafafa;
  font-size: 0.75rem;
  white-space: nowrap;
  box-shadow:
    0 0 0 1px rgb(255 255 255 / 0.06),
    0 8px 20px rgb(0 0 0 / 0.18);
  pointer-events: none;
  transition: left 90ms var(--ui-ease-out);
}
.throughput-tip[data-flip] {
  translate: calc(-100% - 1.5rem) 0;
}
.throughput-tip-day {
  color: #a1a1aa;
  font-size: 0.6875rem;
}
.throughput-num {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

:global(:root[data-theme='dark']) .throughput-tip {
  background: #2a2a2e;
  box-shadow:
    0 0 0 1px rgb(255 255 255 / 0.1),
    0 8px 20px rgb(0 0 0 / 0.4);
}
@media (prefers-color-scheme: dark) {
  :global(:root:not([data-theme='light'])) .throughput-tip {
    background: #2a2a2e;
    box-shadow:
      0 0 0 1px rgb(255 255 255 / 0.1),
      0 8px 20px rgb(0 0 0 / 0.4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .throughput-crosshair,
  .throughput-dot,
  .throughput-tip {
    transition: none;
  }
}
</style>
