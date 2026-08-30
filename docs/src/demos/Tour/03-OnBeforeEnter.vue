<template>
  <section class="demo">
    <h3><code>onBeforeEnter</code>: targets behind a drawer</h3>
    <p class="note">
      A step's target doesn't have to exist yet — <code>onBeforeEnter</code> runs (and is awaited)
      before Tour goes looking for it, so opening whatever the target lives behind (a drawer, an
      accordion panel, a route change) and awaiting <code>nextTick()</code> is enough to guarantee
      it's mounted in time.
    </p>
    <div class="row">
      <Button @click="drawerTourOpen = true">Start tour</Button>
    </div>
    <Drawer v-model:open="drawerOpen" side="right" title="Filters" aria-label="Filters">
      <Button id="tour-drawer-target" variant="outline">Apply saved filter</Button>
    </Drawer>
    <Tour v-model:open="drawerTourOpen" :steps="drawerSteps" />
  </section>
</template>

<script setup lang="ts">
import { nextTick, shallowRef } from 'vue'
import { Button, Drawer, Tour } from 'vael-ui'
import type { TourStep } from 'vael-ui'

const drawerOpen = shallowRef(false)
const drawerTourOpen = shallowRef(false)
const drawerSteps: TourStep[] = [
  {
    target: '#tour-drawer-target',
    title: 'Reuse a saved filter',
    description: 'The drawer opens itself before Tour looks for this button.',
    onBeforeEnter: async () => {
      drawerOpen.value = true
      await nextTick()
    },
  },
]
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-block-end: 1rem;
}
</style>
