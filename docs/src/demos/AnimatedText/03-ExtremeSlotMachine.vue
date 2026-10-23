<template>
  <section class="demo">
    <h3>Extreme: your own swap, a slot-machine drop</h3>
    <p class="note">
      <code>:motion="false"</code> swaps the word at once, and one <code>v-animate</code> with
      <code>replay</code> makes the drop: the new word falls from above on a bouncy spring, squashed
      wide and flat, and springs back to shape as it lands.
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

const drop = computed(() => ({
  initial: { y: '-80%', opacity: 0, scale: '1.08 0.85' },
  spring: { damping: 0.45, response: 0.45 },
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
