<template>
  <section class="demo">
    <h3>Rolling digits</h3>
    <p class="note">
      Only the digits that change roll. A digit that appears or disappears, such as the thousands
      place, fades in or out while the number makes room.
    </p>
    <div class="stage">
      <AnimatedNumber :value="count" class="big" />
    </div>
    <div class="row">
      <Button variant="secondary" size="sm" @click="count -= 1">−1</Button>
      <Button variant="secondary" size="sm" @click="count += 1">+1</Button>
      <Button variant="secondary" size="sm" @click="count += 125">+125</Button>
      <Button variant="secondary" size="sm" @click="count = random()">Random</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { AnimatedNumber, Button } from 'vael-ui'

const count = shallowRef(998)
const random = () => Math.round(Math.random() * 20000)
</script>

<style scoped>
.stage {
  margin-block-end: 1rem;
}
.big {
  font-size: 3rem;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
