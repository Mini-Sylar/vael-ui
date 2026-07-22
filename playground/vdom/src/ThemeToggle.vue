<template>
  <Button size="sm" variant="outline" data-testid="theme-toggle" @click="cycle">
    Theme: {{ mode }}
  </Button>
</template>

<script setup lang="ts">
import { Button, useColorScheme } from 'vael-ui'
import type { ColorSchemeMode } from 'vael-ui'

const STORAGE_KEY = 'vael-ui-playground-theme'
const ORDER: ColorSchemeMode[] = ['system', 'light', 'dark']

const { mode, setMode } = useColorScheme({
  persist: {
    get: () => localStorage.getItem(STORAGE_KEY),
    set: (next) =>
      next ? localStorage.setItem(STORAGE_KEY, next) : localStorage.removeItem(STORAGE_KEY),
  },
})

function cycle() {
  setMode(ORDER[(ORDER.indexOf(mode.value) + 1) % ORDER.length])
}
</script>
