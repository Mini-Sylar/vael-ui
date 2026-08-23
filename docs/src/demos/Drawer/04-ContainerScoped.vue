<template>
  <section class="demo">
    <h3><code>container</code>: scoped to a pane</h3>
    <p class="note">
      Forwarded straight to the underlying <code>Dialog</code>, same as everywhere else. The panel
      slides in from the pane's own edge instead of the viewport's, and only the pane is blocked,
      the rest of the page stays interactive.
    </p>
    <div ref="drawerPane" class="drawer-pane">
      <p class="note" style="margin: 0">A pane with its own content.</p>
      <Button size="sm" variant="outline" @click="containedOpen = true">Open, contained</Button>
    </div>
    <Drawer
      v-model:open="containedOpen"
      :container="drawerPane"
      side="right"
      size="sm"
      title="Filters"
      aria-label="Filters"
    >
      <p class="drawer-lede">Scrolling the page and clicking outside the pane both still work.</p>
    </Drawer>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Button, Drawer } from 'vael-ui'

const drawerPane = useTemplateRef('drawerPane')
const containedOpen = shallowRef(false)
</script>

<style scoped>
.drawer-lede {
  margin: 0;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}

.drawer-pane {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  block-size: 16rem;
  max-inline-size: 28rem;
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
</style>
