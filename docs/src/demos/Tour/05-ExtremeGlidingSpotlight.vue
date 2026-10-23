<template>
  <section class="demo">
    <h3>Extreme: the spotlight glides and the callout swaps by direction</h3>
    <p class="note">
      Tour's spotlight and callout glide between steps on their own. This one adds
      <code>morph</code>, so the callout grows out of the element it points at, and
      <code>swap</code> with <code>direction</code>: the step content in the slot is one keyed root
      whose <code>v-animate</code> comes in from the side you're travelling toward and leaves toward
      the side you came from. Press Next or Back mid-glide and it turns from where it is.
    </p>
    <div class="row">
      <Button @click="open = true">Start tour</Button>
    </div>
    <div class="glide-app">
      <div class="glide-bar">
        <Avatar id="glide-avatar" name="Ama Mensah" />
        <Button id="glide-new" size="sm">New project</Button>
      </div>
      <Card
        id="glide-card"
        class="glide-card"
        title="Weekly report"
        description="Sales, signups and churn for the last seven days."
      />
    </div>
    <Tour v-model:open="open" :steps="steps" :motion="motion" @step-change="onStep">
      <template #default="{ step, index, total, isFirst, isLast, prev, next, close }">
        <div :key="index" v-animate="slide" class="glide-step">
          <p class="glide-count">Step {{ index + 1 }} of {{ total }}</p>
          <strong>{{ step?.title }}</strong>
          <p class="glide-body">{{ step?.description }}</p>
          <div class="glide-actions">
            <Button size="sm" variant="ghost" @click="close">Skip</Button>
            <Button v-if="!isFirst" size="sm" variant="outline" @click="prev">Back</Button>
            <Button size="sm" @click="isLast ? close() : next()">
              {{ isLast ? 'Done' : 'Next' }}
            </Button>
          </div>
        </div>
      </template>
    </Tour>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Avatar, Button, Card, Tour, vAnimate } from 'vael-ui'
import type { MotionWhere, PopoverMotion, TourStep, TourStepChangeDetails } from 'vael-ui'

const open = shallowRef(false)
const steps: TourStep[] = [
  {
    target: '#glide-avatar',
    title: 'Your profile',
    description: 'Change your photo, name and notification settings.',
    spotlightPadding: 4,
    spotlightRadius: 999,
  },
  {
    target: '#glide-new',
    title: 'Start something',
    description: 'Projects hold your reports, files and the people you share them with.',
    spotlightPadding: 4,
    spotlightRadius: 8,
  },
  {
    target: '#glide-card',
    side: 'top',
    title: 'Your weekly report',
    description: 'It refreshes every Monday morning.',
    spotlightPadding: 8,
    spotlightRadius: 20,
  },
]

// Which way the next swap goes, read from the step change before the content swaps.
const direction = shallowRef<1 | -1>(1)
function onStep({ step, previousStep }: TourStepChangeDetails) {
  if (!step || !previousStep) return
  direction.value = steps.indexOf(step) >= steps.indexOf(previousStep) ? 1 : -1
}

const motion = computed<PopoverMotion>(() => ({
  morph: { from: 'trigger', hide: false },
  swap: 'sync',
  direction: direction.value,
  spring: { damping: 1, response: 0.4 },
}))

// Comes in from the side it's travelling toward, leaves toward the side it came from.
const slide = {
  initial: ({ direction }: MotionWhere) => ({ opacity: 0, x: direction * 20 }),
  exit: ({ direction }: MotionWhere) => ({ opacity: 0, x: direction * -20 }),
}
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-block-end: 1rem;
}
.glide-app {
  display: grid;
  gap: 1.5rem;
  max-inline-size: 32rem;
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.glide-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.glide-card {
  justify-self: end;
  max-inline-size: 16rem;
}
.glide-step {
  display: grid;
  gap: 0.375rem;
  min-inline-size: 15rem;
  max-inline-size: 18rem;
  padding: 0.875rem;
}
.glide-count {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}
.glide-body {
  margin: 0;
  font-size: 0.875rem;
}
.glide-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.375rem;
  margin-block-start: 0.375rem;
}
</style>
