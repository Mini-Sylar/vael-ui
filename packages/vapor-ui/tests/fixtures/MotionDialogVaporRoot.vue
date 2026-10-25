<template>
  <button data-testid="open" @click="open = true">open</button>
  <Dialog v-model:open="open" title="Motion" :motion="motion">
    <template #default="{ target }">
      <p v-animate:intro="{ initial: { opacity: 0 } }">a</p>
      <p v-animate:intro="{ initial: { opacity: 0 } }">b</p>
      <Button :ref="target('done')">Done</Button>
    </template>
  </Dialog>
  <output data-testid="log">{{ log.join('|') }}</output>
</template>

<script setup lang="ts" vapor>
// Built `vael-ui/vapor`: the enter hook records each call and the targets it was handed.
import { shallowRef } from 'vue'
import { Button, Dialog } from 'vael-ui/vapor'
import { vAnimateVapor as vAnimate } from 'vael-ui/motion'
import type { DialogMotion } from 'vael-ui'

const open = shallowRef(false)
const log = shallowRef<string[]>([])
const motion: DialogMotion = {
  enter: ({ panel }, { targets }) => {
    const seen = Object.entries(targets)
      .map(([name, els]) => `${name}:${els.length}`)
      .sort()
    log.value = [...log.value, seen.join(',')]
    return panel.animate([{ opacity: 0 }, {}], 60)
  },
}
void vAnimate
</script>
