<template>
  <section class="demo">
    <h3>Extreme: a black hole</h3>
    <div class="row">
      <Button
        v-for="option in options"
        :key="option"
        size="sm"
        :variant="mode === option ? 'primary' : 'secondary'"
        :aria-pressed="mode === option"
        @click="(event: MouseEvent) => setMode(option, { from: event })"
      >
        {{ option[0]!.toUpperCase() + option.slice(1) }}
      </Button>
    </div>
    <p class="demo-status">Showing {{ resolvedMode }}.</p>
  </section>
</template>

<script setup lang="ts">
import { Button, useColorScheme } from 'vael-ui'
import type { ColorSchemeMode } from 'vael-ui'

const options: ColorSchemeMode[] = ['light', 'dark', 'system']

// The new scheme bursts out once the old page is nearly gone.
const later = (value: number) => ({
  value,
  delay: 0.55,
  duration: 800,
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
})

const { mode, resolvedMode, setMode } = useColorScheme({
  motion: {
    duration: 750,
    easing: 'cubic-bezier(0.7, 0, 0.84, 0)',
    exit: { old: { rotate: -180, scale: 0, blur: 12 } },
    initial: { new: { rotate: later(90), scale: later(0), blur: later(20), opacity: later(0) } },
  },
})
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
}
</style>
