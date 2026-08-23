<template>
  <section class="demo">
    <h3>Edge-to-edge: <code>side="top"</code> and <code>"bottom"</code></h3>
    <div class="row">
      <Button variant="outline" @click="topOpen = true">Open top</Button>
      <Button variant="outline" @click="bottomOpen = true">Open bottom</Button>
    </div>
    <Drawer
      v-model:open="topOpen"
      side="top"
      size="sm"
      title="New version available"
      aria-label="Announcement"
    >
      <p class="drawer-lede">
        A quick, dismissible strip anchored to the top edge instead of a corner toast.
      </p>
    </Drawer>
    <Drawer
      v-model:open="bottomOpen"
      side="bottom"
      size="sm"
      title="Cookie settings"
      aria-label="Cookie settings"
    >
      <p class="drawer-lede">
        No drag gesture here, just a plain slide. Use <code>&lt;BottomSheet&gt;</code> instead when
        the panel needs to be flicked away.
      </p>
    </Drawer>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Drawer } from 'vael-ui'

const topOpen = shallowRef(false)
const bottomOpen = shallowRef(false)
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.drawer-lede {
  margin: 0;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}
</style>
