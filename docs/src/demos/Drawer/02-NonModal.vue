<template>
  <section class="demo">
    <h3>Non-modal: <code>:modal="false"</code></h3>
    <p class="note">
      No overlay, no scroll lock, no stolen focus. The page behind stays fully interactive, try
      clicking the counter while the drawer is open. Escape still closes it.
    </p>
    <div class="row">
      <Button variant="outline" @click="pinnedOpen = !pinnedOpen">
        {{ pinnedOpen ? 'Close' : 'Open' }} filters
      </Button>
      <Button variant="secondary" @click="counter++">Clicked {{ counter }} times</Button>
    </div>
    <Drawer
      v-model:open="pinnedOpen"
      side="left"
      :modal="false"
      title="Filters"
      aria-label="Filters"
    >
      <p class="drawer-lede">Non-modal drawers are for persistent, page-adjacent panels.</p>
    </Drawer>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Drawer } from 'vael-ui'

const pinnedOpen = shallowRef(false)
const counter = shallowRef(0)
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
