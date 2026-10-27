<!-- AnimatedText with its one part, the crossfading text, as a save status. -->
<template>
  <div data-specimen class="specimen">
    <PhCheckCircle :size="16" weight="fill" class="icon" />
    <AnimatedText value="All changes saved" />
  </div>
</template>

<script setup lang="ts">
import { AnimatedText } from 'vael-ui'
import { PhCheckCircle } from '@phosphor-icons/vue'
</script>

<style scoped>
.specimen {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
}
.icon {
  color: var(--ui-success, currentColor);
}
</style>
