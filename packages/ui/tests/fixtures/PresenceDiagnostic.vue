<template>
  <button data-testid="hide" @click="show = false">Hide</button>
  <output data-testid="exits">{{ exits }}</output>

  <!-- Control: no Teleport in the exiting subtree -->
  <AnimatePresence v-if="!props.teleported" :on-exit-complete="() => exits++">
    <motion.div
      v-if="show"
      key="plain"
      data-testid="probe"
      :exit="{ opacity: 0 }"
      :transition="{ duration: 0.4 }"
    >
      plain
    </motion.div>
  </AnimatePresence>

  <!-- Variable under test: identical, but the motion.div renders through a Teleport -->
  <AnimatePresence v-else :on-exit-complete="() => exits++">
    <Teleport v-if="show" to="body">
      <motion.div
        key="teleported"
        data-testid="probe"
        :exit="{ opacity: 0 }"
        :transition="{ duration: 0.4 }"
      >
        teleported
      </motion.div>
    </Teleport>
  </AnimatePresence>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { AnimatePresence, motion } from 'motion-v'

const props = defineProps<{ teleported: boolean }>()

const show = shallowRef(true)
const exits = shallowRef(0)
</script>
