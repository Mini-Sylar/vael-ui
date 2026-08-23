<template>
  <section class="demo">
    <h3>Basic usage: main click vs. chevron dropdown</h3>
    <div class="row">
      <SplitButton :items="saveItems" @click="onSave" @select="onSaveOption">Save</SplitButton>
      <output class="panel-text">{{ lastAction }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { SplitButton } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'

const saveItems: MenuEntry[] = [
  { label: 'Save As…', value: 'save-as' },
  { label: 'Save a Copy', value: 'save-copy' },
  { type: 'separator' },
  { label: 'Save & Close', value: 'save-close' },
]

const lastAction = shallowRef('No action yet')

function onSave() {
  lastAction.value = 'Main action: Save'
}
function onSaveOption(item: MenuItemData) {
  lastAction.value = `Dropdown action: ${item.label}`
}
</script>
