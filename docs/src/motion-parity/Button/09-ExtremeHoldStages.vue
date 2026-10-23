<template>
  <section class="demo">
    <h3>Extreme: the label changes as you hold</h3>
    <p class="note">
      The default slot gets <code>holdProgress</code>, from 0 to 1, so the label can change at 20%,
      50% and 100%, crossfading with AnimatedText, and <code>--ui-hold-progress</code> deepens the
      colour. Past 60% the button trembles: <code>states.active</code> plays a nudge with
      <code>repeat</code> that loops until you let go, then eases home. A
      <code>v-animate</code> with <code>replay</code> pops the button when the hold completes.
    </p>
    <span v-animate="pop" class="pop">
      <Button
        ref="button"
        variant="danger"
        :hold="2000"
        class="stages"
        :motion="tremble"
        @click="deleted++"
      >
        <template #default="{ holdProgress }">
          <AnimatedText :value="labelFor(holdProgress)" />
        </template>
      </Button>
    </span>
    <p class="demo-status">Deleted {{ deleted }} times.</p>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { AnimatedText, Button, vAnimate } from 'vael-ui'
import type { ButtonMotion } from 'vael-ui'

const deleted = shallowRef(0)
const button = useTemplateRef('button')
const progress = computed(() => button.value?.holdProgress ?? 0)

function labelFor(progress: number): string {
  if (progress >= 1) return 'Deleted'
  if (progress >= 0.5) return 'Almost there…'
  if (progress >= 0.2) return 'Keep holding'
  return 'Hold to delete'
}

// From 60% of the 2s hold, a 1.5px nudge back and forth until you let go; done, it stops.
// 32ms a swing: GSAP speeds its 50ms swing up as the hold fills, about this fast on average.
const done = computed(() => progress.value >= 1)
const tremble = computed<ButtonMotion>(() => ({
  states: {
    active: !done.value
      ? {
          root: {
            x: {
              value: [0, 1.5],
              duration: 32,
              easing: 'linear',
              repeat: Infinity,
              repeatType: 'reverse',
              delay: 1.2,
            },
          },
        }
      : {},
  },
}))

// An elastic settle: through rest, back past it twice, then still.
const elastic =
  'linear(0, 0.223, 0.5, 0.772, 1, 1.161, 1.25, 1.275, 1.25, 1.194, 1.125, 1.057, 1, 0.96, 0.938, 0.931, 0.938, 0.951, 0.969, 0.986, 1, 1.01, 1.016, 1.017, 1.016, 1.012, 1.008, 1.004, 1, 0.997, 0.996, 0.996, 0.996, 0.997, 0.998, 0.999, 1, 1.001, 1.001, 1.001, 1)'

// Replays on each completed hold: swells, then settles with a wobble.
const pop = computed(() => ({
  initial: { scale: 1.06 },
  duration: 500,
  easing: elastic,
  replay: deleted.value,
}))
</script>

<style scoped>
.pop {
  display: inline-block;
}
.stages {
  min-inline-size: 11rem;
  --ui-button-bg: color-mix(
    in oklab,
    var(--ui-danger) calc(100% - var(--ui-hold-progress, 0) * 30%),
    black
  );
}
</style>
