<template>
  <span data-testid="mode">{{ mode }}</span>
  <span data-testid="resolved">{{ resolvedMode }}</span>
  <button data-testid="set-light" @click="setMode('light')" />
  <button data-testid="set-dark" @click="setMode('dark')" />
  <button data-testid="set-system" @click="setMode('system')" />
</template>

<script setup lang="ts">
import { useColorScheme } from '../../src/composables/useColorScheme'
import type { ColorSchemeMode } from '../../src/composables/useColorScheme'

const props = defineProps<{
  persist?: { get: () => string | null; set: (mode: ColorSchemeMode | null) => void }
}>()
const { mode, resolvedMode, setMode } = useColorScheme({ persist: props.persist })
</script>
