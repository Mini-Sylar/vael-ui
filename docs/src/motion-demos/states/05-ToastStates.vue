<template>
  <section class="demo">
    <h3>Toast states</h3>
    <div class="row">
      <Button @click="run(true)">Save report</Button>
      <Button variant="secondary" @click="run(false)">Save and fail</Button>
    </div>
    <Toaster :motion="motion" />
  </section>
</template>

<script setup lang="ts">
import { Button, Toaster, toast } from 'vael-ui'
import type { ToasterMotion } from 'vael-ui'

// Moving into a variant plays its state: the error toast shakes, the success icon pops.
const motion: ToasterMotion = {
  states: {
    error: { toast: { x: [0, -8, 8, -4, 0] } },
    success: { icon: { scale: [1, 1.4, 1] } },
  },
}

function run(ok: boolean) {
  toast.promise(
    new Promise((resolve, reject) => setTimeout(ok ? resolve : () => reject(new Error()), 1000)),
    { loading: 'Saving report', success: 'Report saved', error: 'Could not save report' },
    { id: 'report' },
  )
}
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.75rem;
}
</style>
