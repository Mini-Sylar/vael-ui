<template>
  <section class="demo">
    <h3>Your component</h3>
    <Button @click="open = !open">Notes</Button>
    <Transition v-bind="motion.transition">
      <div v-if="open" class="sheet">
        <strong>Meeting notes</strong>
        <p>Ship the beta on Friday and review feedback on Monday.</p>
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button } from 'vael-ui'
import { useMotion } from 'vael-ui/motion'

const open = shallowRef(false)
const motion = useMotion('overlay')
</script>

<style scoped>
.sheet {
  margin-block-start: 1rem;
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
}
.sheet p {
  margin: 0.25rem 0 0;
  color: var(--ui-text-muted);
}
</style>
