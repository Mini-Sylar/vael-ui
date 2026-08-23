<template>
  <section class="demo">
    <h3>Controlled state and custom rows via the <code>#item</code> slot</h3>
    <p class="note">
      <code>v-model:open</code> is optional, bind it only to drive the menu from outside (here a
      second button toggles it). The <code>#item</code> slot overrides a row's content while keeping
      its behavior, this one renders a color swatch beside each label.
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
