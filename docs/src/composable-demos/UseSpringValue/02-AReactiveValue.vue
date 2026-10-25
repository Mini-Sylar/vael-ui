<template>
  <section class="demo">
    <h3>A reactive value</h3>
    <p class="note">
      <code>useSpringValue</code> returns a ref you bind in the template. Press Go to 100, then Go
      to 0 before it arrives: <code>set()</code> turns the value around from its current position
      and speed, with no jump back. <code>jump()</code> places it with no motion, and
      <code>stop()</code> parks it where it is.
    </p>
    <div class="meter" aria-hidden="true">
      <div class="meter-fill" :style="{ scale: `${Math.max(value, 0) / 100} 1` }" />
    </div>
    <output class="demo-status">{{ Math.round(value) }}</output>
    <div class="row">
      <Button
        v-for="target in [0, 40, 100]"
        :key="target"
        size="sm"
        variant="outline"
        @click="set(target)"
      >
        Go to {{ target }}
      </Button>
      <Button size="sm" variant="ghost" @click="jump(0)">Jump to 0</Button>
      <Button size="sm" variant="ghost" @click="stop()">Stop</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Button } from 'vael-ui'
import { useSpringValue } from 'vael-ui/motion'

// Slightly under 1, so a long move settles with one small overshoot.
const { value, set, jump, stop } = useSpringValue(0, { damping: 0.8, response: 0.6 })
</script>

<style scoped>
.meter {
  overflow: hidden;
  max-inline-size: 28rem;
  block-size: 0.75rem;
  border-radius: 999px;
  background: var(--ui-muted);
}
.meter-fill {
  block-size: 100%;
  background: var(--ui-primary);
  transform-origin: 0 50%;
}
</style>
