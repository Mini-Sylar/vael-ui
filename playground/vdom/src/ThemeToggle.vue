<template>
  <Button size="sm" variant="outline" data-testid="theme-toggle" @click="cycle">
    Theme: {{ choice }}
  </Button>
</template>

<script setup lang="ts">
/**
 * Demonstrates the library's theme contract: vael-ui ships no toggle of its
 * own (theme state is an app concern, same as Radix/Base UI) — it only
 * promises to respond to `<html data-theme="dark|light">` and, absent that,
 * to `prefers-color-scheme`. This is the reference implementation of the
 * "app owns the toggle" half of that contract, including persistence.
 */
import { onMounted, shallowRef } from 'vue'
import { Button } from 'vael-ui'

type ThemeChoice = 'system' | 'light' | 'dark'
const STORAGE_KEY = 'vael-ui-playground-theme'

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
