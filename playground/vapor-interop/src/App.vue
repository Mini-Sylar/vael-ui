<template>
  <main>
    <h1>Vapor host</h1>

    <Button data-testid="save" @click="fakeSave">
      <template #default="{ loading }">{{ loading ? 'Saving…' : 'Save' }}</template>
    </Button>

    <Button data-testid="open-dialog" @click="open = true">Open dialog</Button>
    <output data-testid="dialog-state">{{ open ? 'open' : 'closed' }}</output>

    <Dialog v-model:open="open" aria-label="Vapor-hosted dialog">
      <template #default="{ close }">
        <p data-testid="dialog-content">Rendered through a Vapor parent.</p>
        <Button data-testid="dialog-done" @click="close()">Done</Button>
      </template>
    </Dialog>

    <Popover v-model:open="popoverOpen">
      <template #trigger="{ open, setTriggerEl }">
        <Button
          data-testid="popover-trigger"
          variant="outline"
          :ref="setTriggerEl"
          @click="popoverOpen = !popoverOpen"
        >
          {{ open ? 'Close' : 'Open' }} popover
        </Button>
      </template>
      <template #default="{ close }">
        <p data-testid="popover-content">Rendered through a Vapor parent.</p>
        <Button data-testid="popover-done" @click="close()">Done</Button>
      </template>
    </Popover>
    <output data-testid="popover-state">{{ popoverOpen ? 'open' : 'closed' }}</output>

    <Menu :items="menuItems" @select="onMenuSelect">
      <template #trigger>
        <Button data-testid="menu-trigger" variant="outline">Menu</Button>
      </template>
    </Menu>
    <output data-testid="menu-selected">{{ menuSelected }}</output>

    <Tabs v-model:active="active" :items="items">
      <template #default="{ active: current, select, items: list }">
        <Button
          v-for="item in list"
          :key="item"
          :variant="current === item ? 'primary' : 'ghost'"
          size="sm"
          role="tab"
          :aria-selected="current === item"
          :tabindex="current === item ? 0 : -1"
          :data-testid="`tab-${item}`"
          @click="select(item)"
        >
          {{ item }}
        </Button>
      </template>
    </Tabs>
    <output data-testid="active-tab">{{ active }}</output>

    <Toolbar aria-label="Vapor toolbar">
      <Button data-testid="toolbar-first" size="sm" variant="ghost">First</Button>
      <Button data-testid="toolbar-second" size="sm" variant="ghost">Second</Button>
      <Button data-testid="toolbar-third" size="sm" variant="ghost">Third</Button>
    </Toolbar>

    <Accordion v-model:value="accordionValue">
      <AccordionItem value="one" title="One">
        <template #default="{ open, toggle }">
          <p data-testid="accordion-one-content">Open: {{ open }}</p>
          <Button data-testid="accordion-one-toggle" size="sm" @click="toggle">Toggle</Button>
        </template>
      </AccordionItem>
      <AccordionItem value="two" title="Two">Second panel, rendered through Vapor.</AccordionItem>
    </Accordion>
    <output data-testid="accordion-value">{{ accordionValue }}</output>

    <Select v-model="selectValue" :items="selectItems" placeholder="Vapor select">
      <template #item="{ item, selected }">
        <span data-testid="vapor-item-label">{{ item.label }} (vapor #{{ item.value }})</span>
        <span v-if="selected" data-testid="vapor-item-selected-mark">*</span>
      </template>
    </Select>
    <output data-testid="select-value">{{ selectValue ?? '(none)' }}</output>

    <Slider ref="sliderRef" v-model="sliderValue" :min="0" :max="100" name="vapor-slider" />
    <output data-testid="slider-value">{{ sliderValue.join(',') }}</output>
    <output data-testid="slider-thumb-order">{{ thumbOrder }}</output>

    <div
      :ref="setDropzoneEl"
      data-testid="vapor-dropzone"
      :data-drag-over="isDragOver || undefined"
    >
      Drop files here (Vapor-native element, useFileDrop attached directly)
    </div>
    <output data-testid="dropzone-files">{{ droppedFiles.join(',') }}</output>
  </main>
</template>

<script setup lang="ts" vapor>
// Vapor-compiled host to verify slot-heavy interop with VDOM vael-ui components
import { computed, shallowRef, useTemplateRef } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import {
  Accordion,
  AccordionItem,
  Button,
  Dialog,
  Menu,
  Popover,
  Select,
  Slider,
  Tabs,
  Toolbar,
  useFileDrop,
} from 'vael-ui'
import type { MenuEntry, MenuItemData, SelectItemData } from 'vael-ui'

type Section = 'alpha' | 'beta'
const items: Section[] = ['alpha', 'beta']
const active = shallowRef<Section>('alpha')

const open = shallowRef(false)
const popoverOpen = shallowRef(false)
// Toolbar imperatively mutates Vapor nodes; Accordion uses provide/inject + slots across boundary
const accordionValue = shallowRef<string | null>(null)

// Menu's recursive render + items crossing interop boundary is the real risk
const menuItems: MenuEntry[] = [
  { label: 'Rename', value: 'rename' },
  { label: 'Delete', value: 'delete', danger: true },
]
const menuSelected = shallowRef('')
function onMenuSelect(item: MenuItemData) {
  menuSelected.value = item.value ?? ''
}
// Promise return enables auto-loading, exercises attrs-fallthrough interception
const fakeSave = () => new Promise((resolve) => setTimeout(resolve, 300))

// Tests virtualized scoped slot from Vapor parent (SelectListBody must invoke Vapor slot per row)
const selectItems: SelectItemData[] = Array.from({ length: 1000 }, (_, i) => ({
  label: `Item ${i}`,
  value: i,
}))
const selectValue = shallowRef<string | number | null>(null)

// Tests component ref + array template refs (v-for ordering via vaporInteropPlugin)
// Range mode from start avoids Vue limitation while testing array resolution through boundary
const sliderValue = shallowRef<[number, number]>([20, 80])
const sliderRef = useTemplateRef<{ thumbEls: HTMLElement[] | null }>('sliderRef')
const thumbOrder = computed(
  () => sliderRef.value?.thumbEls?.map((el) => el.dataset.index).join(',') ?? '',
)

// Tests headless composable (useFileDrop) wired to Vapor-owned DOM node
// useTemplateRef doesn't resolve for Vapor-native elements on Vue 3.6.0-beta.17; using callback ref
const dropzoneEl = shallowRef<HTMLElement | null>(null)
function setDropzoneEl(el: Element | ComponentPublicInstance | null) {
  dropzoneEl.value = el as HTMLElement | null
}
// Cast needed because vue 3.6.0-beta.17 types don't unify with library's 3.5.39
const dropzoneTarget = computed(() => dropzoneEl.value) as unknown as Parameters<
  typeof useFileDrop
>[0]
const droppedFiles = shallowRef<string[]>([])
const { isDragOver } = useFileDrop(dropzoneTarget, {
  onFiles: (files) => {
    droppedFiles.value = files.map((file) => file.name)
  },
})
</script>
