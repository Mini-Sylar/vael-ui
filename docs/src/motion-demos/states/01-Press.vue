<template>
  <section class="demo">
    <h3>Press</h3>
    <div class="row">
      <Button :motion="squishy">Squishy</Button>
      <Button :motion="lift">Lift</Button>
      <Button>Default</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Button } from 'vael-ui'
import type { ButtonMotion } from 'vael-ui'

// Pressed: shrinks on a bouncy spring.
const squishy: ButtonMotion = {
  states: { active: { root: { scale: '0.92' } } },
  spring: { damping: 0.5, response: 0.35 },
}
// Hovered (mouse only): rises 2px.
const lift: ButtonMotion = { states: { hover: { root: { y: -2 } } } }
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
</style>
