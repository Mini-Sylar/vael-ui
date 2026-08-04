<template>
  <button data-testid="before">Before</button>
  <Toolbar aria-label="Text formatting" :orientation="orientation">
    <Button data-testid="bold" size="sm" variant="ghost">Bold</Button>
    <Button data-testid="italic" size="sm" variant="ghost">Italic</Button>
    <button type="button" data-testid="pressed" :aria-pressed="pressed" @click="pressed = !pressed">
      Highlight
    </button>
    <span class="ui-toolbar-separator" role="separator" />
    <Menu :items="menuItems" @select="onSelect">
      <template #trigger>
        <Button data-testid="menu-trigger" size="sm" variant="ghost">More</Button>
      </template>
    </Menu>
    <Button data-testid="disabled" size="sm" variant="ghost" disabled>Strikethrough</Button>
  </Toolbar>
  <button data-testid="after">After</button>
  <output data-testid="selected">{{ selected }}</output>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Button from '../../src/components/Button/Button.vue'
import Menu from '../../src/components/Menu/Menu.vue'
import Toolbar from '../../src/components/Toolbar/Toolbar.vue'
import type { MenuItemData } from '../../src/components/Menu/Menu.vue'

defineProps<{ orientation?: 'horizontal' | 'vertical' }>()

const pressed = shallowRef(false)
const selected = shallowRef('')
const menuItems: MenuItemData[] = [
  { label: 'Link', value: 'link' },
  { label: 'Clear formatting', value: 'clear' },
]
function onSelect(item: MenuItemData) {
  selected.value = item.value ?? ''
}
</script>
