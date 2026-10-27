<!-- Type test helper: your own component naming its targets with useMotion. -->
<template>
  <Transition v-bind="motion.transition">
    <div v-if="open" :ref="motion.part('root')">
      <slot :target="motion.target" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useMotion } from '../../src/motion/useMotion'

defineProps<{ open: boolean }>()
defineSlots<{ default(props: { target: typeof motion.target }): unknown }>()

const motion = useMotion<'title' | 'lines'>('overlay')
</script>
