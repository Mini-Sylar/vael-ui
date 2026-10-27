<template>
  <section class="demo">
    <h3>Draw a stroke</h3>
    <div class="row">
      <svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true">
        <path
          v-animate="{
            initial: { pathLength: 0 },
            duration: 500,
            easing: 'out',
            replay: drawn,
          }"
          d="M5 12.5 10 17.5 19 7"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <Button variant="secondary" @click="drawn++">Draw again</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

const drawn = shallowRef(0)
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  color: var(--ui-success);
}
</style>
