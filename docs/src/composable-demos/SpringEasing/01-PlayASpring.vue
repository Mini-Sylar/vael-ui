<template>
  <section class="demo">
    <h3>Feel a spring, then take its curve</h3>
    <p class="note">
      <code>springEasing</code> turns a spring into the options
      <code>element.animate()</code> takes, so your own animation moves on a spring with no library.
      Shape a spring, press Play, and the ball moves with
      <code>ball.animate(frames, springEasing(spring))</code>. Below 1, damping overshoots the
      dashed target line.
    </p>
    <div class="track">
      <div ref="ball" class="ball" />
    </div>
    <div class="controls">
      <label class="field">
        <span>Damping <output>{{ damping.toFixed(2) }}</output></span>
        <Slider v-model="damping" :min="0.2" :max="1" :step="0.01" aria-label="Damping" />
      </label>
      <label class="field">
        <span>Response <output>{{ response.toFixed(2) }}s</output></span>
        <Slider v-model="response" :min="0.15" :max="1" :step="0.01" aria-label="Response" />
      </label>
    </div>
    <div class="row">
      <Button size="sm" @click="play">Play</Button>
      <Button
        v-for="preset in presets"
        :key="preset.name"
        size="sm"
        variant="outline"
        @click="pick(preset)"
      >
        {{ preset.name }}
      </Button>
      <output class="demo-status">{{ spring.duration }} ms</output>
    </div>
    <svg class="curve" viewBox="0 0 200 80" role="img" aria-label="The spring's curve">
      <line x1="0" :y1="target" x2="200" :y2="target" class="target" />
      <polyline :points="points" class="line" />
    </svg>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { Button, Slider } from 'vael-ui'
import { springEasing } from 'vael-ui/motion'

const presets = [
  { name: 'Snappy', damping: 1, response: 0.25 },
  { name: 'Smooth', damping: 1, response: 0.4 },
  { name: 'Bouncy', damping: 0.55, response: 0.45 },
]
const damping = shallowRef(0.6)
const response = shallowRef(0.4)
const ball = useTemplateRef<HTMLElement>('ball')
const spring = computed(() => springEasing({ damping: damping.value, response: response.value }))

// The easing's own numbers, drawn as the curve it follows; the dashed line is the target.
const values = computed(() => spring.value.easing.slice(7, -1).split(',').map(Number))
const peak = computed(() => Math.max(1, ...values.value))
const height = (v: number) => 70 - (v / peak.value) * 60
const target = computed(() => height(1))
const points = computed(() =>
  values.value.map((v, i) => `${(i / (values.value.length - 1)) * 200},${height(v)}`).join(' '),
)

function pick(preset: (typeof presets)[number]) {
  damping.value = preset.damping
  response.value = preset.response
  play()
}

// Out and back, so every press shows the whole move.
let leg = 0
function play() {
  const el = ball.value
  if (!el) return
  const distance = el.parentElement!.clientWidth - el.offsetWidth
  const to = leg++ % 2 === 0 ? distance : 0
  el.animate([{ translate: `${to ? 0 : distance}px 0` }, { translate: `${to}px 0` }], {
    ...spring.value,
    fill: 'forwards',
  })
}
</script>

<style scoped>
.track {
  max-inline-size: 28rem;
  padding: 0.5rem;
  border-radius: 999px;
  background: var(--ui-muted);
}
.ball {
  inline-size: 1.75rem;
  block-size: 1.75rem;
  border-radius: 50%;
  background: var(--ui-primary);
}
.controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: 1rem;
  max-inline-size: 28rem;
  margin-block: 1rem;
}
.field {
  display: grid;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}
.field output {
  margin-inline-start: 0.25rem;
  color: var(--ui-text);
  font-variant-numeric: tabular-nums;
}
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.curve {
  display: block;
  inline-size: 100%;
  max-inline-size: 28rem;
  margin-block-start: 1rem;
  overflow: visible;
}
.target {
  stroke: var(--ui-border-strong);
  stroke-dasharray: 3 3;
}
.line {
  fill: none;
  stroke: var(--ui-primary);
  stroke-width: 2;
  stroke-linejoin: round;
}
</style>
