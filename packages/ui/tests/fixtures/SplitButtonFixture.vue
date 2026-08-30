<template>
  <div data-testid="basic">
    <SplitButton v-model:open="isOpen" :items="items" @click="onMainClick" @select="onSelect">
      Save
    </SplitButton>
  </div>
  <output data-testid="click-count">{{ clickCount }}</output>
  <output data-testid="last-action">{{ lastAction }}</output>
  <output data-testid="open-state">{{ isOpen ? 'open' : 'closed' }}</output>

  <div data-testid="disabled-wrap">
    <SplitButton :items="items" disabled @click="onDisabledClick">Disabled</SplitButton>
  </div>
  <output data-testid="disabled-click-count">{{ disabledClickCount }}</output>

  <div data-testid="async-wrap">
    <SplitButton :items="items" @click="onAsyncClick">Async</SplitButton>
  </div>
  <output data-testid="async-count">{{ asyncClickCount }}</output>

  <div data-testid="custom-label">
    <SplitButton :items="items" trigger-label="Save options">Save</SplitButton>
  </div>

  <div data-testid="item-slot">
    <SplitButton :items="items">
      Save
      <template #item="{ item }">
        <span data-testid="custom-row">{{ item.label }}!</span>
      </template>
    </SplitButton>
  </div>

  <div data-testid="header-footer">
    <SplitButton :items="items">
      Save
      <template #header><span data-testid="split-button-header">header</span></template>
      <template #footer><span data-testid="split-button-footer">footer</span></template>
    </SplitButton>
  </div>

  <div data-testid="variant-outline">
    <SplitButton :items="items" variant="outline" size="sm">Outline</SplitButton>
  </div>

  <div data-testid="imperative">
    <SplitButton ref="imperativeRef" :items="items">Imperative</SplitButton>
  </div>
  <button data-testid="imperative-open" type="button" @click="imperativeRef?.open()">open</button>
  <button data-testid="imperative-close" type="button" @click="imperativeRef?.close()">
    close
  </button>
  <output data-testid="imperative-refs">{{
    imperativeRef?.el && imperativeRef?.mainEl && imperativeRef?.triggerEl ? 'ready' : 'not-ready'
  }}</output>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import SplitButton from '../../src/components/SplitButton/SplitButton.vue'
import type { MenuItemData } from '../../src/components/Menu/Menu.vue'

const items: MenuItemData[] = [
  { label: 'Save As...', value: 'save-as' },
  { label: 'Save a Copy', value: 'save-copy' },
  { label: 'Duplicate', value: 'duplicate', disabled: true },
]

const clickCount = shallowRef(0)
const disabledClickCount = shallowRef(0)
const asyncClickCount = shallowRef(0)
const lastAction = shallowRef('')
const isOpen = shallowRef(false)
const imperativeRef = useTemplateRef('imperativeRef')

function onMainClick() {
  clickCount.value++
}
function onDisabledClick() {
  disabledClickCount.value++
}
function onSelect(item: MenuItemData) {
  lastAction.value = item.label
}
async function onAsyncClick() {
  await new Promise((resolve) => setTimeout(resolve, 20))
  asyncClickCount.value++
}

defineExpose({ clickCount, disabledClickCount, asyncClickCount, lastAction, isOpen })
</script>
