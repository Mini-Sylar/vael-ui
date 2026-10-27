<template>
  <section class="demo">
    <h3>Controlled open state and custom rows with <code>#item</code></h3>
    <p class="note">
      <code>v-model:open</code> is optional. Bind it only to open the menu from outside, here from a
      second button. The <code>#item</code> slot replaces a row's content and keeps its behavior;
      this one adds a color swatch beside each label.
    </p>
    <div class="row">
      <Menu v-model:open="paletteOpen" :items="paletteItems" @select="pickColor">
        <template #trigger>
          <Button variant="outline">
            <span class="swatch" :style="{ background: color }" />
            {{ color }}
          </Button>
        </template>
        <template #item="{ item }">
          <span class="swatch" :style="{ background: item.value }" />
          {{ item.label }}
        </template>
      </Menu>
      <Button size="sm" variant="ghost" @click="paletteOpen = !paletteOpen">
        Toggle from outside
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Menu } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'

const paletteOpen = shallowRef(false)
const color = shallowRef('#6366f1')
const paletteItems: MenuEntry[] = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Rose', value: '#f43f5e' },
]
function pickColor(item: MenuItemData) {
  if (item.value) color.value = item.value
}
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.swatch {
  display: inline-block;
  inline-size: 0.85em;
  block-size: 0.85em;
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 15%);
}
</style>
