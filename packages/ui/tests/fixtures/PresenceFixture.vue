<template>
  <button data-testid="open" @click="present = true">Open</button>
  <output data-testid="exits">{{ exits }}</output>

  <!--
    Spike pattern: presence of the whole Dialog is external. `force-mount`
    disables the internal <Transition>; AnimatePresence must defer the real
    unmount (through the Teleport boundary) while motion.div runs its exit.
    The close control lives inside the panel — the modal overlay covers
    everything outside it.
  -->
  <AnimatePresence :on-exit-complete="() => exits++">
    <Dialog v-if="present" key="dialog" :open="true" force-mount aria-label="Spike dialog">
      <motion.div
        data-testid="motion-content"
        :initial="{ opacity: 0, scale: 0.96 }"
        :animate="{ opacity: 1, scale: 1 }"
        :exit="{ opacity: 0, scale: 0.96 }"
        :transition="{ duration: 0.25, ease: 'easeOut' }"
      >
        Spike content
        <button data-testid="dismiss" @click="present = false">Dismiss</button>
      </motion.div>
    </Dialog>
  </AnimatePresence>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import Dialog from '../../src/components/Dialog.vue'

const present = shallowRef(false)
const exits = shallowRef(0)
</script>
