<template>
  <section class="demo">
    <h3>A settle when it completes</h3>
    <p class="note">
      A bar that reaches its <code>max</code> enters the <code>complete</code> state. Give that
      state a look of your own: here the bar swells a little and settles.
    </p>
    <div class="row">
      <Progress :value="value" label="Setup" :motion="motion" class="bar" />
      <Button size="sm" variant="outline" @click="run">
        {{ value > 0 && value < 100 ? 'Running…' : 'Run setup' }}
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onScopeDispose, shallowRef } from 'vue'
import { Button, Progress } from 'vael-ui'
import type { ProgressMotion } from 'vael-ui'

const motion: ProgressMotion = {
  states: { complete: { root: { scale: [1, 1.02, 1] } } },
}

const value = shallowRef(0)
let timer: ReturnType<typeof setInterval> | undefined

function run() {
  clearInterval(timer)
  value.value = 0
  timer = setInterval(() => {
    value.value = Math.min(100, value.value + 8)
    if (value.value >= 100) clearInterval(timer)
  }, 150)
}
onScopeDispose(() => clearInterval(timer))
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.bar {
  flex: 1;
  max-inline-size: 20rem;
}
</style>
