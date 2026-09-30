<template>
  <template v-for="(segment, index) in segments" :key="index">
    <InlineCode v-if="segment.code" :code="segment.text" :kind="classifyInline(segment.text)" />
    <template v-else>{{ segment.text }}</template>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InlineCode from './InlineCode.vue'
import { classifyInline } from '../composables/highlightInline'

const props = defineProps<{ text: string }>()

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
