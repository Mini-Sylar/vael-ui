<template>
  <button v-tooltip="'hi'" v-scroll-mask>Hover</button>
</template>

<script setup lang="ts">
/**
 * Throwaway consumer of the BUILT output (dist/index.d.ts, not src).
 * `strictTemplates` is off project-wide (attrs-fallthrough), so an
 * unresolved template directive doesn't error either way — the type-level
 * check below is what actually proves dist/index.d.ts's
 * `declare module 'vue' { GlobalDirectives }` augmentation is present,
 * by asserting the keys exist on Vue's own interface directly.
 */
import type { GlobalDirectives } from 'vue'
import type { TooltipHostProps } from '../dist/index.js'

type AssertHasKey<K extends string> = K extends keyof GlobalDirectives ? true : never
const _hasVTooltip: AssertHasKey<'vTooltip'> = true
const _hasVScrollMask: AssertHasKey<'vScrollMask'> = true

defineProps<{ x?: TooltipHostProps }>()
</script>
