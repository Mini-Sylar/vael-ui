<template>
  <section class="demo">
    <Button variant="primary" :disabled="loading" @click="onClick">
      {{ loading ? 'Saving…' : 'Save' }}
    </Button>
    <p class="demo-status">
      In-flight requests: <strong>{{ inFlight }}</strong>
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, useAsyncLoading } from 'vael-ui'

const { loading, run } = useAsyncLoading()
const inFlight = shallowRef(0)

function fakeSave(): Promise<void> {
  inFlight.value++
  return new Promise((resolve) => {
    setTimeout(() => {
      inFlight.value--
      resolve()
    }, 1200)
  })
}

function onClick() {
  // run() tracks every call it's given — loading only clears once ALL of
  // them have settled, so overlapping clicks (or several independent
  // buttons sharing one useAsyncLoading()) never flicker the state early.
  void run(fakeSave)
  void run(fakeSave)
}
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.demo-status {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
</style>
