<template>
  <section class="demo">
    <h3>Shown and hidden</h3>
    <Button variant="secondary" @click="shown = !shown">{{ shown ? 'Hide' : 'Show' }}</Button>
    <p v-show="shown" v-animate="{ initial: { opacity: 0, y: -6 } }" class="tip">
      Hidden with <code>v-show</code>, it stays in the page, and still leaves and comes back.
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

const shown = shallowRef(true)
</script>

<style scoped>
.tip {
  margin: 1rem 0 0;
  padding: 0.75rem 1rem;
  border-radius: var(--ui-radius);
  background: var(--ui-surface-raised, var(--ui-surface));
}
</style>
