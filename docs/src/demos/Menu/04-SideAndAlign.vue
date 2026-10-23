<template>
  <section class="demo">
    <h3><code>side</code> and <code>align</code>, placed like Popover</h3>
    <p class="note">
      Menu's <code>align</code> defaults to <code>start</code>, not Popover's <code>center</code>,
      so the menu lines up with its trigger's edge like a native dropdown.
    </p>
    <div class="row">
      <Menu
        v-for="config in sideAlignConfigs"
        :key="`${config.side}-${config.align}`"
        :items="simpleItems"
        :side="config.side"
        :align="config.align"
        @select="onSelect"
      >
        <template #trigger>
          <Button size="sm" variant="secondary">{{ config.side }}/{{ config.align }}</Button>
        </template>
      </Menu>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Menu } from 'vael-ui'
import type { MenuAlign, MenuEntry, MenuItemData, MenuSide } from 'vael-ui'

const lastAction = shallowRef('')
function onSelect(item: MenuItemData) {
  lastAction.value = item.label
}

const simpleItems: MenuEntry[] = [
  { label: 'One', value: 'one' },
  { label: 'Two', value: 'two' },
  { label: 'Three', value: 'three' },
]

const sideAlignConfigs: { side: MenuSide; align: MenuAlign }[] = [
  { side: 'top', align: 'start' },
  { side: 'bottom', align: 'center' },
  { side: 'right', align: 'end' },
  { side: 'left', align: 'center' },
]
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
