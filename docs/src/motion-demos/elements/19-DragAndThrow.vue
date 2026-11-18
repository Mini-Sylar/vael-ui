<template>
  <section class="demo">
    <h3>Linked to a drag</h3>
    <div class="throw-area">
      <div
        v-if="shown"
        ref="card"
        v-animate="{
          animate: { rotate: () => mapRange(drag.x.value, [-200, 200], [-12, 12]) },
          exit: () => ({
            x: { value: Math.sign(drag.x.value || 1) * 400, spring: 'smooth' },
            opacity: 0,
          }),
        }"
        class="throw-card"
      >
        Throw me
      </div>
      <Button v-else size="sm" variant="secondary" @click="shown = true">Again</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Button, useDrag } from 'vael-ui'
import { mapRange, vAnimate } from 'vael-ui/motion'

const shown = shallowRef(true)
// It follows the pointer and tilts with it (a live value), springs home when let go near the
// middle, and thrown far enough it's removed: its exit carries on at the speed it was thrown.
const drag = useDrag({
  el: useTemplateRef('card'),
  onRelease: ({ projected }) => void (Math.abs(projected.x) > 150 && (shown.value = false)),
})
</script>

<style scoped>
.throw-area {
  display: grid;
  place-items: center;
  block-size: 9rem;
}
.throw-card {
  display: grid;
  place-items: center;
  inline-size: 9rem;
  block-size: 6rem;
  border-radius: var(--ui-radius);
  background: var(--ui-primary);
  color: var(--ui-primary-contrast);
  font-weight: 600;
  cursor: grab;
  user-select: none;
}
</style>
