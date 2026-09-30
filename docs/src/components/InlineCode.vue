<template>
  <code v-if="html && highlighted" class="inline-code shiki" v-html="html" />
  <code v-else class="inline-code" :class="{ 'code-ref': kind === 'ref' }">{{ code }}</code>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { highlightInline } from '../composables/highlightInline'
import type { InlineKind, InlineLang } from '../composables/highlightInline'

const props = withDefaults(
  defineProps<{
    code: string
    lang?: InlineLang
    /** `code`/`cssVar`/`cssValue` are syntax-highlighted, `ref` takes the accent color, `plain` is monospace only. */
    kind?: InlineKind
  }>(),
  { lang: 'ts', kind: 'code' },
)

const html = shallowRef('')
const highlighted = computed(() => props.kind !== 'ref' && props.kind !== 'plain')

// Plain text renders first; the highlighted version swaps in once Shiki
// resolves. A stale result for a previous `code` is dropped.
watch(
  () => [props.code, props.lang, props.kind] as const,
  async ([code, lang, kind]) => {
    if (kind === 'ref' || kind === 'plain') return
    const result = await highlightInline(code, kind === 'code' ? lang : kind)
    if (code === props.code && lang === props.lang) html.value = result
  },
  { immediate: true },
)
</script>

<style scoped>
.inline-code {
  font-size: 0.85em;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
</style>
