<template>
  <section class="demo">
    <h3>Extreme: the label changes as you hold</h3>
    <p class="note">
      The default slot gets <code>holdProgress</code>, from 0 to 1, so the label can change at 20%,
      50% and 100%, crossfading with AnimatedText, and <code>--ui-hold-progress</code> deepens the
      color. Past 60% the button trembles: <code>states.active</code> plays a nudge with
      <code>repeat</code> that loops until you let go, quicker as the hold fills. The same
      <code>motion</code> pops it on each delete: <code>replay</code> plays its
      <code>initial</code> again, on a bouncy spring.
    </p>
    <Button ref="button" variant="danger" :hold="2000" class="stages" :motion @click="deleted++">
      <template #default="{ holdProgress }">
        <AnimatedText :value="labelFor(holdProgress)" />
      </template>
    </Button>
    <p class="demo-status">Deleted {{ deleted }} times.</p>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { AnimatedText, Button } from 'vael-ui'
import type { ButtonMotion } from 'vael-ui'

const deleted = shallowRef(0)
const button = useTemplateRef('button')

function labelFor(progress: number): string {
  if (progress >= 1) return 'Deleted'
  if (progress >= 0.5) return 'Almost there…'
  if (progress >= 0.2) return 'Keep holding'
  return 'Hold to delete'
}

const progress = computed(() => button.value?.holdProgress ?? 0)

// Each delete pops with a wobble; from 60% of the hold until it's done, it trembles.
const motion = computed<ButtonMotion>(() => ({
  initial: { root: { scale: { value: 1.06, spring: { damping: 0.4, response: 0.5 } } } },
  replay: deleted.value,
  appear: false,
  states: {
    active:
      progress.value >= 0.6 && progress.value < 1
        ? {
            root: {
              // Out and back in 100 ms like GSAP's yoyo, quicker as the hold fills, as its timeScale does.
              x: {
                value: [0, 1.5, 0],
                duration: 100 / (1 + (progress.value - 0.6) * 4),
                easing: 'linear',
                repeat: Infinity,
              },
            },
          }
        : {},
  },
}))
</script>

<style scoped>
.stages {
  min-inline-size: 11rem;
  --ui-button-bg: color-mix(
    in oklab,
    var(--ui-danger) calc(100% - var(--ui-hold-progress, 0) * 30%),
    black
  );
}
</style>
