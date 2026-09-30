<template>
  <template v-for="(segment, index) in segments" :key="index">
    <InlineCode v-if="segment.code" :code="segment.text" :plain="isTemplateSyntax(segment.text)" />
    <template v-else>{{ segment.text }}</template>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InlineCode from './InlineCode.vue'

const props = defineProps<{ text: string }>()

// Descriptions mix TypeScript values (`'chip'`, `details.cancel()`) with Vue
// template syntax (`v-model:open`, `@change`, `#item`, `<input>`). The TS
// grammar mangles the latter, so template syntax stays plain monospace.
function isTemplateSyntax(code: string): boolean {
  return /^(v-|@|#|<|:)/.test(code)
}

// Descriptions come from JSDoc, which wraps long lines; only `code` spans
// carry markup, so everything else renders as plain text.
const segments = computed(() =>
  props.text
    .replace(/\s*\n\s*/g, ' ')
    .split(/(`[^`]+`)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('`') && part.endsWith('`') && part.length > 2
        ? { code: true, text: part.slice(1, -1) }
        : { code: false, text: part },
    ),
)
</script>
