<template>
  <section class="demo">
    <h3>Extreme: your own swap, a slot-machine drop</h3>
    <p class="note">
      <code>:motion="false"</code> swaps the word at once, and one <code>v-animate</code> with
      <code>replay</code> makes the drop: the new word falls from above with a little overshoot,
      squashed wide and flat, and springs back to shape as it lands. Each value has its own timing.
    </p>
    <p class="line">
      Ship it on
      <AnimatedText :value="days[index]!" :motion="false" v-animate="drop" class="word" />
    </p>
    <Button variant="secondary" size="sm" @click="spin">Spin</Button>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { AnimatedText, Button, vAnimate } from 'vael-ui'

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const index = shallowRef(4)
const spins = shallowRef(0)

function spin() {
  index.value = (index.value + 1 + Math.floor(Math.random() * 3)) % days.length
  spins.value++
}

// GSAP's back.out(2.5): it starts at full speed and overshoots a little.
const backOut =
  'linear(0, 0.216, 0.405, 0.569, 0.711, 0.83, 0.93, 1.01, 1.074, 1.122, 1.156, 1.177, 1.188, 1.188, 1.181, 1.167, 1.148, 1.126, 1.102, 1.077, 1.053, 1.032, 1.015, 1.004, 1)'

const drop = computed(() => ({
  initial: {
    y: { value: '-80%', duration: 350, easing: backOut },
    opacity: { value: 0, duration: 350, easing: backOut },
    // The squash holds while it falls, then wobbles out as it lands.
    scale: { value: '1.08 0.85', delay: 0.25, spring: { damping: 0.3, response: 0.3 } },
  },
  replay: spins.value,
}))
</script>

<style scoped>
.line {
  margin: 0 0 1rem;
  font-size: 1.5rem;
  font-weight: 600;
}
.word {
  display: inline-block;
  color: var(--ui-primary);
  transform-origin: bottom;
}
</style>
