<template>
  <button data-testid="before">Before</button>
  <SpeedDial
    ref="speedDialRef"
    v-model:open="open"
    aria-label="Actions"
    :items="items"
    :direction="direction"
    :open-on="openOn"
    :disabled="disabled"
    :close-on-select="closeOnSelect"
    @select="onSelect"
  />
  <button data-testid="after">After</button>
  <output data-testid="selected">{{ selected }}</output>
  <output data-testid="select-count">{{ selectCount }}</output>
  <output data-testid="home-select-count">{{ homeSelectCount }}</output>
  <output data-testid="open-state">{{ open }}</output>
  <output data-testid="exposed-el">{{ speedDialRef?.el ? 'yes' : 'no' }}</output>
  <button data-testid="call-open" @click="speedDialRef?.open()">open()</button>
  <button data-testid="call-close" @click="speedDialRef?.close()">close()</button>
  <button data-testid="call-toggle" @click="speedDialRef?.toggle()">toggle()</button>
</template>

<script setup lang="ts">
import { h, shallowRef, useTemplateRef } from 'vue'
import SpeedDial from '../../src/components/SpeedDial/SpeedDial.vue'
import type {
  SpeedDialDirection,
  SpeedDialItem,
  SpeedDialTriggerMode,
} from '../../src/components/SpeedDial/SpeedDial.vue'

withDefaults(
  defineProps<{
    direction?: SpeedDialDirection
    openOn?: SpeedDialTriggerMode
    disabled?: boolean
    closeOnSelect?: boolean
  }>(),
  {
    // 'down' (not the component's own 'up' default): the fixture mounts
    // near the top of the test page with no room above it, so fanning up
    // pushes action buttons above the viewport and real pointer clicks fail.
    direction: 'down',
    openOn: 'click',
    disabled: false,
    closeOnSelect: true,
  },
)

const open = defineModel<boolean>('open', { default: false })

const selected = shallowRef('')
const selectCount = shallowRef(0)
const homeSelectCount = shallowRef(0)

const StarIcon = { name: 'StarIcon', render: () => h('svg', { 'data-testid': 'star-icon' }) }

const items: SpeedDialItem[] = [
  { label: 'Home', value: 'home', icon: StarIcon, onSelect: () => homeSelectCount.value++ },
  { label: 'Folder', value: 'folder' },
  { label: 'Message', value: 'message' },
  { label: 'Trash', value: 'trash', disabled: true },
]

function onSelect(item: SpeedDialItem) {
  selected.value = item.value ?? ''
  selectCount.value += 1
}

const speedDialRef = useTemplateRef('speedDialRef')
</script>
