<template>
  <button data-testid="select" @click="selectOpen = !selectOpen">select</button>
  <button data-testid="chip" @click="picked = picked.slice(1)">chip</button>
  <button data-testid="step" @click="steps = [...steps, steps.length]">step</button>
  <button data-testid="tip" @click="tipOpen = !tipOpen">tip</button>
  <button data-testid="message" @click="messageOpen = !messageOpen">message</button>
  <Select
    v-model="picked"
    v-model:open="selectOpen"
    multiple
    :items="items"
    :motion="selectMotion"
  />
  <Timeline :items="steps" :motion="timelineMotion" />
  <Tooltip v-model:open="tipOpen" :trigger-el="tipTrigger" :motion="tipMotion">Tip</Tooltip>
  <button ref="tipTrigger">trigger</button>
  <Message v-model:open="messageOpen" title="Saved" :motion="messageMotion" />
  <output data-testid="log">{{ log.join('|') }}</output>
</template>

<script setup lang="ts" vapor>
// Built `vael-ui/vapor`: each hook records which part it was handed.
import { shallowRef, useTemplateRef } from 'vue'
import { Message, Select, Timeline, Tooltip } from 'vael-ui/vapor'
import type { MessageMotion, SelectMotion, TimelineMotion, TooltipMotion } from 'vael-ui'

const items = [
  { label: 'Accra', value: 'acc' },
  { label: 'Kumasi', value: 'kum' },
]
const picked = shallowRef(['acc', 'kum'])
const selectOpen = shallowRef(false)
const steps = shallowRef([0])
const tipOpen = shallowRef(false)
const messageOpen = shallowRef(false)
const tipTrigger = useTemplateRef<HTMLElement>('tipTrigger')
const log = shallowRef<string[]>([])
const note = (entry: string) => (log.value = [...log.value, entry])
const fade = (el: HTMLElement) => el.animate([{ opacity: 1 }, { opacity: 0 }], 60)

const selectMotion: SelectMotion = {
  enter: ({ panel }) => void note(`select:${panel.className.includes('ui-select-panel')}`),
  chips: { leave: ({ chip }) => (note(`chip:${chip.classList.contains('ui-chip')}`), fade(chip)) },
}
const timelineMotion: TimelineMotion = {
  enter: ({ marker, previousConnector }) => void note(`step:${!!marker}:${!!previousConnector}`),
}
const tipMotion: TooltipMotion = {
  enter: ({ panel }) => void note(`tip:${panel.className.includes('ui-tooltip-panel')}`),
}
const messageMotion: MessageMotion = {
  leave: ({ root }) => (note(`message:${root.className.includes('ui-message')}`), fade(root)),
}
</script>
