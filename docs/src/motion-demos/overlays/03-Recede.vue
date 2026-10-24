<template>
  <section class="demo">
    <h3>The page recedes</h3>
    <div ref="stage" class="stage">
      <header class="bar">Acme board</header>
      <p>Launch plan</p>
      <p>Design review on Thursday</p>
      <p>Ship the beta by the end of the month</p>
    </div>
    <Button @click="open = true">Open filters</Button>
    <Drawer v-model:open="open" side="right" title="Filters" :motion="motion">
      <Button variant="outline" @click="open = false">Done</Button>
    </Drawer>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Button, Drawer } from 'vael-ui'
import type { DialogMotion } from 'vael-ui'

const open = shallowRef(false)
const stage = useTemplateRef<HTMLElement>('stage')

// The stage shrinks and rounds while the drawer is open.
const motion: DialogMotion = {
  linked: {
    page: { el: () => stage.value, open: { scale: '0.94', borderRadius: '12px' } },
  },
}
</script>

<style scoped>
.stage {
  margin-block-end: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
  overflow: hidden;
}
.bar {
  padding: 0.75rem 1rem;
  border-block-end: 1px solid var(--ui-border);
  font-weight: 600;
}
.stage p {
  margin: 0;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}
</style>
