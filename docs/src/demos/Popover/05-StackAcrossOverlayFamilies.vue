<template>
  <section class="demo">
    <h3>Six overlay families deep, all open at once, Tour still on top of everything</h3>
    <p class="note">
      Unlike the stress test above (one overlay at a time, previous one closed first), every one of
      these stays open: Popover, Menu, Drawer, Combobox, and BottomSheet, each opened from a button
      inside the last. They all share the same open-order layer stack, so it doesn't matter how many
      are stacked or which kinds they are. Starting the Tour at the end targets the very first
      button in the chain - buried under all five - and its callout still renders on top of every
      one of them.
    </p>

    <Popover v-model:open="popoverOpen">
      <template #trigger="{ open, setTriggerEl }">
        <Button
          id="chain-start"
          :ref="setTriggerEl"
          variant="outline"
          @click="popoverOpen = !popoverOpen"
        >
          {{ open ? 'Close' : 'Start' }} the chain
        </Button>
      </template>
      <template #default>
        <div class="level level-1">
          <span class="level-badge">1 · Popover</span>
          <p class="panel-text">Opened first - ends up at the bottom of the stack.</p>
          <Button ref="menuAnchor" size="sm" @click="menuOpen = true">Open a Menu from here</Button>
        </div>
      </template>
    </Popover>

    <Menu v-model:open="menuOpen" :trigger-el="menuAnchorEl">
      <template #default>
        <div class="level level-2">
          <span class="level-badge">2 · Menu</span>
          <p class="panel-text">A custom Menu body, not auto-closing list items - stays open.</p>
          <Button size="sm" @click="drawerOpen = true">Open a Drawer from here</Button>
        </div>
      </template>
    </Menu>

    <Drawer v-model:open="drawerOpen" title="3 · Drawer" side="right">
      <div class="level level-3">
        <span class="level-badge">3 · Drawer</span>
        <p class="panel-text">Renders above the Menu and Popover beneath it.</p>
        <Combobox
          v-model="comboboxValue"
          v-model:open="comboboxOpen"
          :items="comboboxItems"
          placeholder="Open this Combobox"
        >
          <template #footer>
            <div class="combobox-footer">
              <span class="level-badge">4 · Combobox</span>
              <Button size="sm" @click="sheetOpen = true">Open a BottomSheet from here</Button>
            </div>
          </template>
        </Combobox>
      </div>
    </Drawer>

    <BottomSheet v-model:open="sheetOpen" title="5 · BottomSheet">
      <div class="level level-5">
        <span class="level-badge">5 · BottomSheet</span>
        <p class="panel-text">
          Popover, Menu, Drawer, and Combobox are all still open beneath this. Start the Tour and
          watch its callout land above every one of them.
        </p>
        <Button size="sm" @click="tourOpen = true">Start the Tour</Button>
      </div>
    </BottomSheet>

    <Tour v-model:open="tourOpen" :steps="tourSteps">
      <template #default="{ step, next }">
        <div class="level level-tour">
          <span class="level-badge">6 · Tour</span>
          <h4 class="tour-title">{{ step?.title }}</h4>
          <p class="panel-text">{{ step?.description }}</p>
          <Button size="sm" @click="next()">Done</Button>
        </div>
      </template>
    </Tour>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { BottomSheet, Button, Combobox, Drawer, Menu, Popover, Tour } from 'vael-ui'
import type { SelectItemData, TourStep } from 'vael-ui'

const popoverOpen = shallowRef(false)
const menuOpen = shallowRef(false)
const drawerOpen = shallowRef(false)
const comboboxOpen = shallowRef(false)
const comboboxValue = shallowRef<string | number | null>(null)
const sheetOpen = shallowRef(false)
const tourOpen = shallowRef(false)

// Menu anchors to the button that opens it, not the outer Popover trigger - Button exposes `.el`.
const menuAnchor = useTemplateRef<InstanceType<typeof Button>>('menuAnchor')
const menuAnchorEl = computed(() => menuAnchor.value?.el ?? null)

const comboboxItems: SelectItemData[] = [
  { label: 'One', value: 1 },
  { label: 'Two', value: 2 },
  { label: 'Three', value: 3 },
]

const tourSteps: TourStep[] = [
  {
    target: '#chain-start',
    title: 'Still on top of five open overlays',
    description:
      'This callout targets the very first button in the chain - buried under the Popover, Menu, Drawer, Combobox, and BottomSheet - and still renders above all of them.',
  },
]
</script>

<style scoped>
.level {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.75rem;
  min-inline-size: 16rem;
}

.combobox-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid var(--ui-border, #e4e4e7);
}

.level-badge {
  display: inline-block;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.level-1 .level-badge {
  background: color-mix(in oklch, #6366f1 20%, transparent);
  color: #6366f1;
}
.level-2 .level-badge {
  background: color-mix(in oklch, #ec4899 20%, transparent);
  color: #ec4899;
}
.level-3 .level-badge {
  background: color-mix(in oklch, #f59e0b 20%, transparent);
  color: #f59e0b;
}
.combobox-footer .level-badge {
  background: color-mix(in oklch, #06b6d4 20%, transparent);
  color: #06b6d4;
}
.level-5 .level-badge {
  background: color-mix(in oklch, #10b981 20%, transparent);
  color: #10b981;
}
.level-tour .level-badge {
  background: color-mix(in oklch, #ef4444 20%, transparent);
  color: #ef4444;
}

.tour-title {
  margin: 0;
  font-size: 0.9375rem;
}

.panel-text {
  font-size: 0.8125rem;
  margin: 0;
}
</style>
