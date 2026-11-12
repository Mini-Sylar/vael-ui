<template>
  <Menu :items="items">
    <template #trigger><button ref="menuTrigger" class="trig">Open</button></template>
  </Menu>
  <input ref="field" class="field" />
  <Popover
    v-model:open="anchoredOpen"
    :trigger-el="menuTrigger"
    :motion="{ onAfterEnter: focusAnchored }"
  >
    <input class="afield" />
  </Popover>
  <Popover v-model:open="popOpen" :motion="{ onAfterEnter: focusPop }">
    <template #trigger="{ setTriggerEl }"
      ><button :ref="setTriggerEl" class="ptrig">P</button></template
    >
    <input class="pfield" />
  </Popover>
</template>

<script setup lang="ts" vapor>
import { nextTick, shallowRef, useTemplateRef } from 'vue'
import { Menu, Popover } from 'vael-ui/vapor'

const field = useTemplateRef<HTMLInputElement>('field')
const popOpen = shallowRef(false)
const anchoredOpen = shallowRef(false)
const menuTrigger = useTemplateRef<HTMLElement>('menuTrigger')
const focusAnchored = () => document.querySelector<HTMLElement>('.afield')?.focus()
const focusPop = () => document.querySelector<HTMLElement>('.pfield')?.focus()
const items = [
  { label: 'Rename', onSelect: () => field.value?.focus() },
  { label: 'Later', onSelect: () => nextTick(() => field.value?.focus()) },
  { label: 'Save view', onSelect: () => (popOpen.value = true) },
  { label: 'Anchored', onSelect: () => (anchoredOpen.value = true) },
]
</script>
