<!-- A Create button that grows into its menu, the items opening outward from the centre. -->
<template>
  <section class="demo">
    <h3>Bloom menu</h3>
    <Popover
      open-on-trigger-click
      aria-label="Create"
      :side-offset="overlap"
      :motion="{
        morph: 'trigger',
        spring: { damping: 0.75, response: 0.35 },
        targets: { item: { initial: { opacity: 0, scale: '0.95' }, delay: 0.08, stagger: radial } },
      }"
      :ui="{ panel: 'bloom-panel' }"
    >
      <template #trigger>
        <Button ref="trigger">
          <template #leading><PhPlus /></template>
          Create
        </Button>
      </template>
      <template #default="{ close, target }">
        <div class="head">
          <span>Create</span>
          <Button size="sm" variant="ghost" icon aria-label="Close" @click="close()"
            ><PhX
          /></Button>
        </div>
        <div ref="grid" class="grid">
          <!-- One highlight slides between the cells on hover. -->
          <span ref="spot" class="ui-indicator ui-indicator--grid spot" :style="spotStyle" />
          <Button
            v-for="item in items"
            :key="item.label"
            :ref="target('item')"
            variant="ghost"
            class="item"
            @click="close()"
          >
            <component :is="item.icon" :size="20" />
            <span>{{ item.label }}</span>
          </Button>
        </div>
      </template>
    </Popover>
  </section>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { Button, Popover, useHoverIndicator } from 'vael-ui'
import {
  PhBell,
  PhFileText,
  PhFolder,
  PhKanban,
  PhLink,
  PhPlus,
  PhTable,
  PhX,
} from '@phosphor-icons/vue'

const items = [
  { label: 'Doc', icon: PhFileText },
  { label: 'Board', icon: PhKanban },
  { label: 'Table', icon: PhTable },
  { label: 'Folder', icon: PhFolder },
  { label: 'Reminder', icon: PhBell },
  { label: 'Link', icon: PhLink },
]
// Outward from the centre of the 3 × 2 grid, so the corners land last.
const radial = (i: number) => Math.hypot((i % 3) - 1, Math.floor(i / 3) - 0.5) * 0.06
const trigger = useTemplateRef<{ el: HTMLElement | null }>('trigger')
const grid = useTemplateRef<HTMLElement>('grid')
const spot = useTemplateRef<HTMLElement>('spot')
const { style: spotStyle } = useHoverIndicator(grid, { itemSelector: '.item', indicatorEl: spot })
// The menu's top edge on the button's: it grows out of it.
const overlap = computed(() => -(trigger.value?.el?.offsetHeight ?? 36))
</script>

<style scoped>
.demo {
  display: grid;
  place-items: start center;
  min-block-size: 18rem;
  padding-block-start: 3rem;
}
:global(.bloom-panel) {
  /* On the primary fill, hovers tint with the text colour. */
  --ui-muted: color-mix(in srgb, currentColor 14%, transparent);
  background: var(--ui-primary);
  color: var(--ui-primary-contrast);
  border-radius: 16px;
  box-shadow: none;
}
:global(.bloom-panel .ui-button) {
  color: inherit;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  margin-block-end: 0.5rem;
  font-weight: 600;
}
.grid {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: repeat(3, 5rem);
  gap: 0.25rem;
}
.spot {
  --ui-indicator-bg: var(--ui-muted);
}
.grid :deep(.item) {
  block-size: 4.5rem;
}
/* The icon over its text, both centred: they share the button's label. */
.grid :deep(.item .ui-button-label) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}
/* The highlight is the hover; the button's own fill would double it. */
.grid :deep(.item:hover) {
  --ui-button-bg: transparent;
}
</style>
