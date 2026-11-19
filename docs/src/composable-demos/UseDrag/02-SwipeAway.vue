<template>
  <section class="demo">
    <h3>Swipe a notice away</h3>
    <p class="note">
      <code>axis: 'x'</code> moves it sideways and leaves vertical drags to the page. It fades as
      you drag, using <code>mapRange</code>. Past a third of its width, or thrown, it leaves at the
      speed you threw it.
    </p>
    <div
      v-if="shown"
      ref="notice"
      v-animate="{
        animate: { opacity: () => mapRange(Math.abs(drag.x.value), [0, width()], [1, 0.2]) },
        exit: () => ({ x: { value: gone * width() * 1.2, spring: 'smooth' }, opacity: 0 }),
      }"
      class="notice"
    >
      Your export is ready
    </div>
    <Button v-else size="sm" variant="secondary" @click="shown = true">Bring it back</Button>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Button, useDrag } from 'vael-ui'
import { mapRange, vAnimate } from 'vael-ui/motion'

const shown = shallowRef(true)
const notice = useTemplateRef<HTMLElement>('notice')
const width = () => notice.value?.offsetWidth ?? 300
// Which way it was thrown: read by its `exit` as it leaves.
let gone = 1

const drag = useDrag({
  el: notice,
  axis: 'x',
  // Thrown, or let go past a third of its width: it goes the way it was heading.
  onRelease({ projected }) {
    if (Math.abs(projected.x) < width() / 3) return null
    gone = Math.sign(projected.x)
    shown.value = false
  },
})
</script>

<style scoped>
.notice {
  padding: 0.75rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
  cursor: grab;
  user-select: none;
}
</style>
