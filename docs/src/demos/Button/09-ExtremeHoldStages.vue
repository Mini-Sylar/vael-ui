<template>
  <section class="demo">
    <h3>Extreme: the label changes as you hold</h3>
    <p class="note">
      The default slot gets <code>holdProgress</code>, from 0 to 1, so the label can change at 20%,
      50% and 100%, crossfading with AnimatedText. <code>--ui-hold-progress</code> deepens the
      colour and sets how hard the tremble past 60% shakes. Motion keys:
      <code>states.active</code> sinks the button while held, and a <code>v-animate</code> with
      <code>replay</code> pops it on completion.
    </p>
    <span v-animate="pop" class="pop">
      <Button
        ref="button"
        variant="danger"
        :hold="2000"
        :motion="press"
        class="stages"
        :class="{ trembling: progress >= 0.6 && progress < 1 }"
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

const press: ButtonMotion = {
  states: { active: { root: { scale: { value: 0.97, spring: { damping: 1, response: 0.25 } } } } },
}

// Replays on each completed hold: swells, then springs back with a bounce.
const pop = computed(() => ({
  initial: { scale: 1.08 },
  spring: { damping: 0.4, response: 0.5 },
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
/* Past 60% the button trembles, harder the closer it gets. */
.stages.trembling {
  animation: tremble 80ms linear infinite alternate;
}
@keyframes tremble {
  from {
    translate: calc((var(--ui-hold-progress, 0) - 0.5) * 6px) 0;
  }
  to {
    translate: calc((0.5 - var(--ui-hold-progress, 0)) * 6px) 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .stages.trembling {
    animation: none;
  }
}
</style>
