<template>
  <section class="demo">
    <h3>Stress test: every overlay primitive behind one step each</h3>
    <p class="note">
      Each step here lives behind a <em>different</em> overlay primitive — Dialog, Drawer, Popover,
      BottomSheet, and CommandPalette — each independently teleported to <code>body</code>, each
      opened and the previous one closed from that step's own <code>onBeforeEnter</code>. Confirms
      the same re-resolve logic holds no matter which primitive is doing the teleporting.
    </p>
    <div class="row">
      <Button ref="teleportPopoverTrigger" @click="teleportTourOpen = true">Start tour</Button>
    </div>
    <Dialog v-model:open="teleportDialogOpen" aria-label="Step 1 target">
      <Button id="tour-in-dialog" variant="outline">Target inside a Dialog</Button>
    </Dialog>
    <Drawer
      v-model:open="teleportDrawerOpen"
      side="right"
      title="Step 2 target"
      aria-label="Step 2 target"
    >
      <Button id="tour-in-drawer" variant="outline">Target inside a Drawer</Button>
    </Drawer>
    <Popover
      v-model:open="teleportPopoverOpen"
      :trigger-el="teleportPopoverTrigger"
      :close-on-outside="false"
    >
      <Button id="tour-in-popover" variant="outline">Target inside a Popover</Button>
    </Popover>
    <BottomSheet v-model:open="teleportSheetOpen" aria-label="Step 4 target">
      <Button id="tour-in-sheet" variant="outline">Target inside a BottomSheet</Button>
    </BottomSheet>
    <CommandPalette v-model:open="teleportPaletteOpen" :items="teleportPaletteItems">
      <template #item="{ item }">
        <span :id="item.id === 'target' ? 'tour-in-palette' : undefined">{{ item.label }}</span>
      </template>
    </CommandPalette>
    <Tour
      v-model:open="teleportTourOpen"
      :steps="teleportSteps"
      @finish="closeTeleportOverlays"
      @skip="closeTeleportOverlays"
    />
  </section>
</template>

<script setup lang="ts">
import { nextTick, shallowRef, useTemplateRef } from 'vue'
import { BottomSheet, Button, CommandPalette, Dialog, Drawer, Popover, Tour } from 'vael-ui'
import type { CommandPaletteItem, TourStep } from 'vael-ui'

const teleportTourOpen = shallowRef(false)
const teleportDialogOpen = shallowRef(false)
const teleportDrawerOpen = shallowRef(false)
const teleportPopoverOpen = shallowRef(false)
const teleportSheetOpen = shallowRef(false)
const teleportPaletteOpen = shallowRef(false)
const teleportPopoverTrigger = useTemplateRef('teleportPopoverTrigger')

const teleportPaletteItems: CommandPaletteItem[] = [
  { id: 'target', label: 'Target inside a CommandPalette' },
  { id: 'other', label: 'Just another item' },
]

function closeTeleportOverlays() {
  teleportDialogOpen.value = false
  teleportDrawerOpen.value = false
  teleportPopoverOpen.value = false
  teleportSheetOpen.value = false
  teleportPaletteOpen.value = false
}

const teleportSteps: TourStep[] = [
  {
    target: '#tour-in-dialog',
    title: 'Behind a Dialog',
    description: 'Opened by this step, closed by the next one.',
    onBeforeEnter: async () => {
      teleportDialogOpen.value = true
      await nextTick()
    },
  },
  {
    target: '#tour-in-drawer',
    title: 'Behind a Drawer',
    description: 'The Dialog just closed; this one opened in its place.',
    onBeforeEnter: async () => {
      teleportDialogOpen.value = false
      teleportDrawerOpen.value = true
      await nextTick()
    },
  },
  {
    target: '#tour-in-popover',
    title: 'Behind a Popover',
    description: 'The Drawer just closed; this one opened in its place.',
    onBeforeEnter: async () => {
      teleportDrawerOpen.value = false
      teleportPopoverOpen.value = true
      await nextTick()
    },
  },
  {
    target: '#tour-in-sheet',
    title: 'Behind a BottomSheet',
    description: 'The Popover just closed; this one opened in its place.',
    onBeforeEnter: async () => {
      teleportPopoverOpen.value = false
      teleportSheetOpen.value = true
      await nextTick()
    },
  },
  {
    target: '#tour-in-palette',
    title: 'Behind a CommandPalette',
    description: 'Five different teleported components, same re-resolve logic each time.',
    onBeforeEnter: async () => {
      teleportSheetOpen.value = false
      teleportPaletteOpen.value = true
      await nextTick()
    },
  },
]
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-block-end: 1rem;
}
</style>
