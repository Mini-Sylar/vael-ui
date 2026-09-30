<template>
  <code v-if="html && !plain" class="inline-code shiki" v-html="html" />
  <code v-else class="inline-code" :class="{ 'inline-code--ref': plain }">{{ code }}</code>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { highlightInline } from '../composables/highlightInline'
import type { InlineLang } from '../composables/highlightInline'

const props = withDefaults(
  defineProps<{
    code: string
    lang?: InlineLang
    /** Vue template syntax (`@skip`, `#item`, `v-model:open`): no highlighting, accent-colored. */
    plain?: boolean
  }>(),
  { lang: 'ts', plain: false },
)

const html = shallowRef('')

// Plain text renders first; the highlighted version swaps in once Shiki
// resolves. A stale result for a previous `code` is dropped.
watch(
  () => [props.code, props.lang] as const,
  async ([code, lang]) => {
    if (props.plain) return
    const result = await highlightInline(code, lang)
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

/* Template references carry no syntax colors of their own, so they take an
   accent: the color picked in the docs theme picker (`--docs-accent`, set by
   App.vue), else the info blue, since the default primary is plain
   black/white and wouldn't stand out. Pulled a quarter of the way toward the
   text color so a light accent (yellow, lime) still reads on the page. */
.inline-code--ref {
  --ref-accent: var(--docs-accent, var(--ui-info));
  color: color-mix(in oklch, var(--ref-accent) 75%, var(--ui-text));
  background: color-mix(in oklch, var(--ref-accent) 12%, transparent);
  font-weight: 500;
  padding: 0.05em 0.3em;
  border-radius: 4px;
  white-space: nowrap;
}
</style>
