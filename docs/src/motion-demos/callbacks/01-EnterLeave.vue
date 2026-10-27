<template>
  <section class="demo">
    <h3>Once it's in, once it's gone</h3>
    <div class="row">
      <Button variant="secondary" @click="shown = !shown">{{ shown ? 'Dismiss' : 'Save' }}</Button>
      <span
        v-if="shown"
        v-animate="{
          initial: { opacity: 0, scale: 0.8 },
          duration: 400,
          onAfterEnter: () => (status = 'onAfterEnter: it has popped in.'),
          onAfterLeave: () => (status = 'onAfterLeave: it has faded out and is gone.'),
        }"
        class="chip"
      >
        Saved
      </span>
    </div>
    <p class="demo-status">{{ status }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

const shown = shallowRef(false)
const status = shallowRef('Save, then dismiss it.')
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-height: 2.5rem;
}
.chip {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: var(--ui-success);
  color: var(--ui-success-contrast);
  font-size: 0.875rem;
}
</style>
