<template>
  <Dialog :open="true" title="Steps" :motion="{ swap: 'wait', direction: 1, onAfterSwap }">
    <section
      :key="step"
      v-animate="{
        initial: ({ direction }) => ({ opacity: 0, x: 40 * direction }),
        exit: ({ direction }) => ({ opacity: 0, x: -40 * direction }),
      }"
      class="view"
    >
      Step {{ step }}
    </section>
  </Dialog>
</template>

<script setup lang="ts" vapor>
// A dialog whose one keyed view swaps; `onAfterSwap` notes how far in the new view is.
import { shallowRef } from 'vue'
import { Dialog } from 'vael-ui/vapor'
import { vAnimateVapor as vAnimate } from 'vael-ui/motion'

const step = shallowRef(1)
const opacityThen = shallowRef(-1)
const onAfterSwap = (view: HTMLElement) =>
  (opacityThen.value = Number(getComputedStyle(view).opacity))
defineExpose({ step, opacityThen })
</script>
