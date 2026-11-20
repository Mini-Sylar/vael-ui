<template>
  <section class="demo">
    <h3>Value bubble in the <code>#thumb</code> slot</h3>
    <p class="note">The bubble shows while you drag, on hover and on keyboard focus.</p>
    <div class="row">
      <Field label="Opacity" label-placement="start" class="slider-field">
        <Slider v-model="opacity" class="bubble-slider">
          <template #thumb="{ value }">
            <span class="bubble">{{ value }}%</span>
          </template>
        </Slider>
      </Field>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Slider } from 'vael-ui'

const opacity = shallowRef(60)
</script>

<style scoped>
.row {
  padding-block-start: 2.25rem;
}

.slider-field {
  inline-size: 100%;
  max-inline-size: 20rem;
}

.bubble {
  position: absolute;
  inset-block-end: calc(100% + 0.5rem);
  padding: 0.125rem 0.375rem;
  border-radius: 0.375rem;
  background: var(--ui-text);
  color: var(--ui-surface);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  pointer-events: none;
  transform-origin: bottom center;
  opacity: 0;
  scale: 0.95;
  translate: 0 2px;
  transition:
    opacity 100ms var(--ui-ease-out),
    scale 100ms var(--ui-ease-out),
    translate 100ms var(--ui-ease-out);
}

.bubble-slider :deep(.ui-slider-thumb[data-active]) .bubble,
.bubble-slider :deep(.ui-slider-thumb[data-focus-visible]) .bubble {
  opacity: 1;
  scale: 1;
  translate: 0 0;
  transition-duration: 150ms;
}

@media (hover: hover) and (pointer: fine) {
  .bubble-slider :deep(.ui-slider-thumb:hover) .bubble {
    opacity: 1;
    scale: 1;
    translate: 0 0;
    transition-duration: 150ms;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bubble {
    scale: 1;
    translate: 0 0;
  }
}
</style>
