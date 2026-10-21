<template>
  <section class="demo">
    <h3>Spread from the click</h3>
    <p class="note">
      Pass the click as <code>{ from: event }</code> and the new scheme spreads in a circle from it.
      This switches the whole site, the same as the header toggle: every
      <code>useColorScheme()</code> call in the page shares one state. Browsers without View
      Transitions, and reduced motion, switch at once.
    </p>
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
const { mode, resolvedMode, setMode } = useColorScheme()
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
}
</style>
