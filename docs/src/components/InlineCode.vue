<template>
  <code
    v-if="html && highlighted"
    class="inline-code shiki"
    :data-shiki="shikiLang"
    v-html="html"
  />
  <code v-else class="inline-code" :class="{ 'code-ref': kind === 'ref' }">{{ code }}</code>
</template>

<script setup lang="ts">
import { computed, onServerPrefetch, shallowRef, watch } from 'vue'
import { highlightInline, highlightedInline } from '../composables/highlightInline'
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

const highlighted = computed(() => props.kind !== 'ref' && props.kind !== 'plain')
const shikiLang = computed(() => (props.kind === 'code' ? props.lang : (props.kind as InlineLang)))
// Highlighted in the prerendered HTML, and from it on the first client render (see main.ts).
const html = shallowRef(
  highlighted.value ? (highlightedInline(props.code, shikiLang.value) ?? '') : '',
)
onServerPrefetch(async () => {
  if (highlighted.value) html.value = await highlightInline(props.code, shikiLang.value)
})

// Otherwise plain text renders first; the highlighted version swaps in once Shiki
// resolves. A stale result for a previous `code` is dropped.
watch(
  () => [props.code, shikiLang.value, highlighted.value] as const,
  async ([code, lang, on]) => {
    if (!on) return
    const result = await highlightInline(code, lang)
    if (code === props.code && lang === shikiLang.value) html.value = result
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
