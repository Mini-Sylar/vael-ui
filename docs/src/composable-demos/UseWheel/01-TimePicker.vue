<template>
  <section class="demo">
    <h3>A time picker</h3>
    <p class="note">
      Two looping wheels. Drag or throw them, scroll with the mouse wheel, or focus one and use the
      arrow keys. Each row reads its own <code>--ui-wheel-offset</code>, so a frame restyles a
      handful of rows and renders nothing. On a phone, every row that passes ticks.
    </p>
    <div class="wheel-row">
      <div
        v-for="column in columns"
        :key="column.label"
        :ref="(el) => (column.el.value = el as HTMLElement | null)"
        class="wheel"
        tabindex="0"
        role="spinbutton"
        :aria-label="column.label"
        :aria-valuenow="column.model.value"
        aria-valuemin="0"
        :aria-valuemax="column.count - 1"
        :aria-valuetext="pad(column.model.value)"
        @keydown="column.wheel.onKeydown"
      >
        <div v-for="i in column.count" :key="i" class="wheel-item" aria-hidden="true">
          {{ pad(i - 1) }}
        </div>
      </div>
      <output class="wheel-readout">{{ pad(hour) }}:{{ pad(minute) }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { useHaptic, useWheel } from 'vael-ui'

const pad = (n: number) => String(n).padStart(2, '0')
const haptic = useHaptic()

const hour = shallowRef(9)
const minute = shallowRef(41)
const hourEl = shallowRef<HTMLElement | null>(null)
const minuteEl = shallowRef<HTMLElement | null>(null)
const common = { size: 36, loop: true, onTick: () => haptic.selection() }

const columns = [
  {
    label: 'Hour',
    count: 24,
    el: hourEl,
    model: hour,
    wheel: useWheel(hour, { el: hourEl, count: 24, ...common }),
  },
  {
    label: 'Minute',
    count: 60,
    el: minuteEl,
    model: minute,
    wheel: useWheel(minute, { el: minuteEl, count: 60, ...common }),
  },
]
</script>

<style scoped>
.wheel-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
/* Rows on a cylinder: each turns by its distance from the centre and sits out at the radius. */
.wheel {
  --row: 36px;
  --angle: 22deg;
  --radius: calc(var(--row) / tan(var(--angle)));
  position: relative;
  inline-size: 4.5rem;
  block-size: calc(var(--row) * 5);
  perspective: 700px;
  overflow: hidden;
  cursor: grab;
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
  mask-image: linear-gradient(transparent, #000 30%, #000 70%, transparent);
}
/* The band behind the row it rests on (a pseudo-element, so not one of the wheel's items). */
.wheel::before {
  content: '';
  position: absolute;
  inset-inline: 0.25rem;
  inset-block-start: calc(50% - var(--row) / 2);
  block-size: var(--row);
  border-radius: calc(var(--ui-radius) - 2px);
  background: color-mix(in oklch, currentColor 8%, transparent);
}
.wheel:active {
  cursor: grabbing;
}
.wheel-item {
  --d: var(--ui-wheel-offset, 9);
  position: absolute;
  inset-inline: 0;
  inset-block-start: calc(50% - var(--row) / 2);
  block-size: var(--row);
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  font-variant-numeric: tabular-nums;
  backface-visibility: hidden;
  transform: rotateX(calc(var(--d) * var(--angle) * -1)) translateZ(var(--radius));
  opacity: calc(1 - min(1, abs(var(--d)) / 3));
}
.wheel-readout {
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
}
</style>
