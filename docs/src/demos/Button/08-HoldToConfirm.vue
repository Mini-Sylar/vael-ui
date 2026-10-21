<template>
  <section class="demo">
    <h3>Hold to confirm</h3>
    <p class="note">
      <code>hold</code> makes a destructive action ask for a press and hold instead of a dialog. A
      fill sweeps across while you hold, linear so it reads as time, and <code>@click</code> fires
      when it completes. Letting go early snaps it back. Space and Enter hold too, and screen
      readers hear "Press and hold to confirm".
    </p>
    <div class="row">
      <Button variant="danger" hold @click="deleted++">Delete project</Button>
      <Button variant="secondary" :hold="2000" @click="reset++">Reset all filters</Button>
    </div>
    <p class="demo-status">Deleted {{ deleted }} times, reset {{ reset }} times.</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button } from 'vael-ui'

const deleted = shallowRef(0)
const reset = shallowRef(0)
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
</style>
