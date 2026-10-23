<template>
  <div class="pg-motion">
    <div class="control-row">
      <span id="pgm-look">Look</span>
      <SelectButton
        v-model="state.look"
        size="sm"
        aria-labelledby="pgm-look"
        :allow-empty="false"
        :items="LOOKS"
      />
    </div>
    <template v-if="state.look === 'custom'">
      <p class="pg-group-label">Timing</p>
      <div class="control-row">
        <label for="pgm-damping">damping</label>
        <span class="pgm-slider">
          <span class="pgm-value">{{ state.damping.toFixed(2) }}</span>
          <Slider id="pgm-damping" v-model="state.damping" :min="0.3" :max="1.2" :step="0.05" />
        </span>
      </div>
      <div class="control-row">
        <label for="pgm-response">response</label>
        <span class="pgm-slider">
          <span class="pgm-value">{{ state.response.toFixed(2) }}s</span>
          <Slider id="pgm-response" v-model="state.response" :min="0.1" :max="1" :step="0.05" />
        </span>
      </div>
      <p class="pg-group-label">Comes in from</p>
      <div v-if="parts.length > 1" class="control-row">
        <span id="pgm-part">part</span>
        <Select
          v-model="state.part"
          size="sm"
          class="control-input"
          aria-labelledby="pgm-part"
          :items="parts.map((p) => ({ label: p, value: p }))"
        />
      </div>
      <div class="control-row">
        <label for="pgm-fade">fade</label>
        <Switch id="pgm-fade" v-model="state.fade" />
      </div>
      <div v-for="axis in AXES" :key="axis.key" class="control-row">
        <label :for="`pgm-${axis.key}`">{{ axis.key }}</label>
        <span class="pgm-slider">
          <span class="pgm-value">{{ state[axis.key] }}{{ axis.unit }}</span>
          <Slider
            :id="`pgm-${axis.key}`"
            v-model="state[axis.key]"
            :min="axis.min"
            :max="axis.max"
            :step="axis.step"
          />
        </span>
      </div>
    </template>
    <p class="pgm-note">
      <template v-if="state.look === 'default'">Its own motion, or your ConfigProvider's.</template>
      <template v-else-if="state.look === 'off'">
        <code>false</code>: it appears and changes at once.
      </template>
      <template v-else>
        Plays as it {{ overlay ? 'opens' : 'mounts' }}. Copy it from Usage below.
      </template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { Select, SelectButton, Slider, Switch } from 'vael-ui'

export interface MotionTabState {
  look: 'default' | 'off' | 'custom'
  damping: number
  response: number
  part: string
  fade: boolean
  y: number
  scale: number
  blur: number
}

defineProps<{ parts: string[]; overlay: boolean }>()
const state = defineModel<MotionTabState>({ required: true })

const LOOKS = [
  { label: 'Default', value: 'default' },
  { label: 'Off', value: 'off' },
  { label: 'Custom', value: 'custom' },
]
const AXES = [
  { key: 'y', min: -24, max: 24, step: 2, unit: 'px' },
  { key: 'scale', min: 0.8, max: 1.2, step: 0.02, unit: '' },
  { key: 'blur', min: 0, max: 12, step: 1, unit: 'px' },
] as const
</script>

<style scoped>
.pg-motion {
  display: grid;
  padding-block: 0.25rem 0.75rem;
}
/* The same rows as the Props tab. */
.control-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  min-block-size: 2.5rem;
  padding: 0.25rem 1rem;
}
.control-row > :first-child {
  font-family: 'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.8125rem;
  white-space: nowrap;
}
.control-input {
  inline-size: 8.75rem;
}
.pg-group-label {
  margin: 0.625rem 1rem 0.25rem;
  padding-block-start: 0.875rem;
  border-block-start: 1px solid var(--ui-border);
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}
.pgm-slider {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-inline-size: 0;
}
.pgm-slider :deep(.ui-slider) {
  inline-size: 8rem;
}
.pgm-value {
  min-inline-size: 3ch;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  text-align: end;
}
.pgm-note {
  margin: 0.75rem 1rem 0;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
