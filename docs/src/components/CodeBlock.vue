<template>
  <div class="code-block">
    <Button
      variant="ghost"
      size="sm"
      icon
      class="copy-button"
      :aria-label="copied ? t('component.copied') : t('component.copy')"
      @click="copy"
    >
      <Transition name="icon-swap" mode="out-in">
        <PhCheck v-if="copied" key="check" :size="14" />
        <PhCopy v-else key="copy" :size="14" />
      </Transition>
    </Button>
    <div v-if="html" class="shiki-host" v-html="html" />
    <pre v-else><code ref="codeEl">{{ code }}</code></pre>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { PhCheck, PhCopy } from '@phosphor-icons/vue'
import { Button } from 'vael-ui'
import { codeToHtml } from 'shiki'

const props = withDefaults(
  defineProps<{ code: string; lang?: 'vue' | 'typescript' | 'bash' | 'json' }>(),
  { lang: 'vue' },
)

const { t } = useI18n()
const copied = shallowRef(false)
const codeEl = useTemplateRef('codeEl')
const html = shallowRef('')

watchEffect(async () => {
  html.value = await codeToHtml(props.code, {
    lang: props.lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  })
})

async function copy() {
  await navigator.clipboard.writeText(codeEl.value?.textContent ?? props.code)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<style scoped>
.code-block {
  position: relative;
  background: var(--ui-muted);
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  overflow: hidden;
}

pre,
.shiki-host :deep(pre) {
  margin: 0;
  padding: 1rem 3rem 1rem 1.25rem;
  overflow-x: auto;
  font-size: 0.85rem;
  line-height: 1.65;
  background: transparent !important;
}

.copy-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: var(--ui-surface);
  border: 1px solid var(--ui-border);
  opacity: 0;
  transition: opacity var(--ui-duration-press) var(--ui-ease-out);
}

.code-block:hover .copy-button,
.code-block:focus-within .copy-button {
  opacity: 1;
}

.icon-swap-enter-active,
.icon-swap-leave-active {
  transition:
    opacity var(--ui-duration-press) var(--ui-ease-in-out),
    transform var(--ui-duration-press) var(--ui-ease-in-out),
    filter var(--ui-duration-press) var(--ui-ease-in-out);
}

.icon-swap-enter-from,
.icon-swap-leave-to {
  opacity: 0;
  transform: scale(0.9);
  filter: blur(2px);
}

@media (prefers-reduced-motion: reduce) {
  .icon-swap-enter-active,
  .icon-swap-leave-active {
    transition: opacity var(--ui-duration-press) var(--ui-ease-in-out);
  }

  .icon-swap-enter-from,
  .icon-swap-leave-to {
    transform: none;
    filter: none;
  }
}
</style>
