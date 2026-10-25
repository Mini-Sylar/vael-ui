<template>
  <section class="demo">
    <h3>Extreme: the spotlight glides between steps</h3>
    <p class="note">
      Tour's spotlight and callout glide between steps on their own, timed by its
      <code>motion</code>: the cutout's position, size and corner radius morph together and the
      callout moves with them. The ring reads the cutout's box from the spotlight's
      <code>--ui-tour-cutout-*</code> properties, and <code>v-animate</code>'s <code>replay</code>
      shows it on each step change and fades it out as the glide ends. Press Next or Back mid-glide
      and it turns from where it is.
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
    <Tour
      ref="tour"
      v-model:open="open"
      v-model:step="step"
      :steps="steps"
      :motion="motion"
      :ui="{ spotlight: 'glide-spotlight' }"
    />
    <!-- Inside the spotlight, so it inherits the cutout's box. -->
    <Teleport v-if="spotlight" :to="spotlight">
      <div v-animate="ring" class="glide-ring" aria-hidden="true" />
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { Avatar, Button, Card, Tour } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'
import type { TourMotion, TourStep } from 'vael-ui'
import type { AnimateDirectiveValue } from 'vael-ui/motion'

const open = shallowRef(false)
const step = shallowRef(0)
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

// GSAP's power3 is a quartic: sampled into linear(), as no cubic-bezier fits it closely.
const quartInOut = `linear(${Array.from({ length: 21 }, (_, i) => {
  const p = i / 20
  return p < 0.5 ? 8 * p ** 4 : 1 - 8 * (1 - p) ** 4
}).join(', ')})`

// power3.inOut over 0.42s, like the original; the callout opens and closes at once.
const motion: TourMotion = {
  duration: 420,
  easing: quartInOut,
  initial: { panel: {} },
  exit: { panel: {} },
}

const tour = useTemplateRef<{ spotlightEl: HTMLElement | null }>('tour')
const spotlight = computed(() => tour.value?.spotlightEl ?? null)
// Each step change: on at once, held for half the glide, faded out (power1.inOut) as it lands.
const ring = computed<AnimateDirectiveValue>(() => ({
  initial: {
    opacity: {
      value: [1, 1, 0],
      times: [0, 0.5, 1],
      duration: 420,
      easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
    },
  },
  appear: false,
  replay: step.value,
}))
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
:global(.glide-spotlight) {
  /* The dim moves to ::before so the ring inside the cutout isn't clipped away. */
  clip-path: none;
  background: none;
  pointer-events: none;
}
:global(.glide-spotlight::before) {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--ui-overlay);
  clip-path: var(--ui-tour-cutout);
  pointer-events: auto;
}
.glide-ring {
  position: absolute;
  top: 0;
  left: 0;
  translate: var(--ui-tour-cutout-x) var(--ui-tour-cutout-y);
  width: var(--ui-tour-cutout-width);
  height: var(--ui-tour-cutout-height);
  border-radius: var(--ui-tour-cutout-radius);
  box-sizing: border-box;
  border: 2px solid var(--ui-primary);
  opacity: 0;
  pointer-events: none;
}
</style>
