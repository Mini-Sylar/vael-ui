<template>
  <section class="demo">
    <h3>Rings and gauges</h3>
    <p class="note">
      <code>type="circle"</code> draws a ring. <code>sweep</code> sets how much of the circle it
      covers, in degrees: <code>180</code> is a half-ring, <code>270</code> a speedometer,
      <code>90</code> a quarter. The value always fills the whole arc. The default slot sits in the
      middle and receives the percentage and the value.
    </p>
    <div class="row rings">
      <Progress type="circle" :value="upload" label="Upload" class="ring-lg">
        <template #default="{ percent }">{{ Math.round(percent) }}%</template>
      </Progress>
      <Progress
        type="circle"
        :sweep="180"
        :value="score"
        :max="850"
        label="Credit score"
        class="ring-lg"
      >
        <template #default="{ value }">
          <span class="gauge-value">{{ value }}</span>
        </template>
      </Progress>
      <Progress
        type="circle"
        :sweep="270"
        :value="speed"
        :max="200"
        variant="warning"
        label="Speed"
        class="ring-lg"
      >
        <template #default="{ value }">
          <span class="gauge-stack">
            {{ value }}
            <small>km/h</small>
          </span>
        </template>
      </Progress>
      <Progress type="circle" :value="storage" :max="256" label="Storage" class="ring-lg" />
    </div>
    <div class="row rings">
      <Progress type="circle" :value="72" variant="success" label="Tests passing" />
      <Progress type="circle" :sweep="90" :value="40" variant="danger" label="Battery" />
      <Progress type="circle" :value="null" label="Syncing" />
      <Progress type="circle" :sweep="180" :value="null" label="Measuring" />
      <span class="inline">
        <Progress type="circle" size="sm" :value="3" :max="5" label="Steps done" />
        3 of 5 steps
      </span>
    </div>
    <div class="row">
      <Button size="sm" variant="outline" @click="advance">Advance</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Progress } from 'vael-ui'
import type { ProgressSegment } from 'vael-ui'

const upload = shallowRef(64)
const score = shallowRef(712)
const speed = shallowRef(88)
function advance() {
  upload.value = upload.value >= 100 ? 0 : Math.min(100, upload.value + 12)
  score.value = score.value >= 850 ? 300 : Math.min(850, score.value + 45)
  speed.value = speed.value >= 200 ? 0 : Math.min(200, speed.value + 28)
}

const storage: ProgressSegment[] = [
  { value: 72, label: 'Apps' },
  { value: 48, label: 'Photos' },
  { value: 30, label: 'Documents' },
]
</script>

<style scoped>
.rings {
  gap: 1.5rem 2rem;
}

.ring-lg {
  --ui-progress-ring-size: 6rem;
}

.ring-lg :deep(.ui-progress-center) {
  font-size: 1rem;
  font-weight: 600;
}

.gauge-value {
  display: block;
  padding-block-end: 0.25rem;
}

.gauge-stack {
  display: grid;
  justify-items: center;
  gap: 0.125rem;
}

.gauge-stack small {
  font-size: 0.6875rem;
  font-weight: 400;
  color: var(--ui-text-muted);
}

.inline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}
</style>
