<template>
  <section ref="root" data-ui-presence data-testid="root">
    <p v-animate:summary="{ opacity: 0 }">summary</p>
    <ul>
      <li v-for="row in rows" :key="row" v-animate:rows="{ y: 6 }">{{ row }}</li>
    </ul>
  </section>
  <Teleport to="body">
    <div ref="panel" data-ui-presence data-testid="teleported">
      <span v-animate:inside="{ scale: 0.9 }">teleported</span>
    </div>
  </Teleport>
  <Transition v-bind="transition">
    <p v-if="shown" data-testid="toggled">toggled</p>
  </Transition>
  <button data-testid="toggle" @click="shown = !shown">toggle</button>
  <output data-testid="joined">{{ joinedText }}</output>
  <output data-testid="log">{{ log.join(',') }}</output>
</template>

<script setup lang="ts">
import { onMounted, reactive, shallowRef, useTemplateRef } from 'vue'
import { inPageOrder, presenceProps, presenceRoot, vAnimate } from './runtime'

const rows = ['a', 'b', 'c']
const root = useTemplateRef<HTMLElement>('root')
const panel = useTemplateRef<HTMLElement>('panel')
const shown = shallowRef(false)
const log = reactive<string[]>([])
const transition = presenceProps(log)
const joinedText = shallowRef('')
// Read after mount, once every child directive has joined.
onMounted(() => {
  requestAnimationFrame(() => {
    const main = inPageOrder(presenceRoot(root.value)).map((j) => j.arg)
    const tele = inPageOrder(presenceRoot(panel.value)).map((j) => j.arg)
    joinedText.value = `${main.join(',')}|${tele.join(',')}`
  })
})
</script>
