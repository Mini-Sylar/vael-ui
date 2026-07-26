<template>
  <Button size="sm" variant="outline" data-testid="theme-toggle" @click="cycle">
    Theme: {{ choice }}
  </Button>
</template>

<script setup lang="ts" vapor>
// vael-ui only promises to respond to <html data-theme>; this toggle just sets that attribute.
import { onMounted, shallowRef } from 'vue'
import { Button } from 'vael-ui/vapor'

type ThemeChoice = 'system' | 'light' | 'dark'
const STORAGE_KEY = 'vael-ui-vapor-playground-theme'

const choice = shallowRef<ThemeChoice>('system')

function apply(next: ThemeChoice) {
  choice.value = next
  if (next === 'system') {
    delete document.documentElement.dataset.theme
    localStorage.removeItem(STORAGE_KEY)
  } else {
    document.documentElement.dataset.theme = next
    localStorage.setItem(STORAGE_KEY, next)
  }
}

function cycle() {
  const order: ThemeChoice[] = ['system', 'light', 'dark']
  apply(order[(order.indexOf(choice.value) + 1) % order.length])
}

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') apply(saved)
})
</script>
