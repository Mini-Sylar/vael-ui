<template>
  <section class="demo">
    <h3>Fixed panel height</h3>
    <p class="note">
      <code>maxPanelHeight</code> caps the panel at a set size regardless of how much viewport space
      is actually available — the list scrolls internally past it instead of the panel growing to
      fill the screen.
    </p>
    <Menu :items="items" :max-panel-height="220" @select="onSelect">
      <template #trigger>
        <Button>Choose a workspace</Button>
      </template>
    </Menu>
    <output class="panel-text">{{ status }}</output>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Menu } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'

const status = shallowRef('')

const items: MenuEntry[] = Array.from({ length: 50 }, (_, i) => ({
  label: `Workspace ${i + 1}`,
  value: `workspace-${i + 1}`,
}))

function onSelect(item: MenuItemData) {
  status.value = `Switched to ${item.label}`
}
</script>

<style scoped>
.panel-text {
  display: block;
  margin-block-start: 0.75rem;
  font-size: 0.8125rem;
}
</style>
