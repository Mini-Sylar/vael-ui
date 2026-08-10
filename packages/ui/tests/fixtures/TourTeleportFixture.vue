<template>
  <button data-testid="trigger" @click="open = true">Start tour</button>
  <output data-testid="step-index">{{ stepIndex }}</output>

  <button ref="popoverTrigger" data-testid="popover-trigger">Popover anchor</button>

  <Dialog v-model:open="dialogOpen" aria-label="Dialog target">
    <button id="in-dialog" data-testid="in-dialog">Dialog target</button>
  </Dialog>

  <Drawer v-model:open="drawerOpen" side="right" aria-label="Drawer target">
    <button id="in-drawer" data-testid="in-drawer">Drawer target</button>
  </Drawer>

  <Popover v-model:open="popoverOpen" :trigger-el="popoverTrigger" :close-on-outside="false">
    <button id="in-popover" data-testid="in-popover">Popover target</button>
  </Popover>

  <BottomSheet v-model:open="sheetOpen" aria-label="Sheet target">
    <button id="in-sheet" data-testid="in-sheet">Sheet target</button>
  </BottomSheet>

  <CommandPalette v-model:open="paletteOpen" :items="paletteItems">
    <template #item="{ item }">
      <span
        :id="item.id === 'target' ? 'in-palette' : undefined"
        :data-testid="item.id === 'target' ? 'in-palette' : undefined"
        >{{ item.label }}</span
      >
    </template>
  </CommandPalette>

  <Tour v-model:open="open" v-model:step="stepIndex" :steps="steps" />
</template>

<script setup lang="ts">
import { nextTick, shallowRef, useTemplateRef } from 'vue'
import Tour from '../../src/components/Tour/Tour.vue'
import Dialog from '../../src/components/Dialog/Dialog.vue'
import Drawer from '../../src/components/Drawer/Drawer.vue'
import Popover from '../../src/components/Popover/Popover.vue'
import BottomSheet from '../../src/components/BottomSheet/BottomSheet.vue'
import CommandPalette from '../../src/components/CommandPalette/CommandPalette.vue'
import type { TourStep } from '../../src/components/Tour/Tour.vue'
import type { CommandPaletteItem } from '../../src/components/CommandPalette/CommandPalette.vue'

const open = shallowRef(false)
const stepIndex = shallowRef(0)

const dialogOpen = shallowRef(false)
const drawerOpen = shallowRef(false)
const popoverOpen = shallowRef(false)
const sheetOpen = shallowRef(false)
const paletteOpen = shallowRef(false)
const popoverTrigger = useTemplateRef('popoverTrigger')

const paletteItems: CommandPaletteItem[] = [
  { id: 'target', label: 'Palette target' },
  { id: 'other', label: 'Other item' },
]

const steps: TourStep[] = [
  {
    target: '#in-dialog',
    title: 'Behind a Dialog',
    onBeforeEnter: async () => {
      dialogOpen.value = true
      await nextTick()
    },
  },
  {
    target: '#in-drawer',
    title: 'Behind a Drawer',
    onBeforeEnter: async () => {
      dialogOpen.value = false
      drawerOpen.value = true
      await nextTick()
    },
  },
  {
    target: '#in-popover',
    title: 'Behind a Popover',
    onBeforeEnter: async () => {
      drawerOpen.value = false
      popoverOpen.value = true
      await nextTick()
    },
  },
  {
    target: '#in-sheet',
    title: 'Behind a BottomSheet',
    onBeforeEnter: async () => {
      popoverOpen.value = false
      sheetOpen.value = true
      await nextTick()
    },
  },
  {
    target: '#in-palette',
    title: 'Behind a CommandPalette',
    onBeforeEnter: async () => {
      sheetOpen.value = false
      paletteOpen.value = true
      await nextTick()
    },
  },
]
</script>
