<template>
  <div ref="root" class="i18n-visual">
    <Button variant="outline" size="sm" class="close-button" tabindex="-1">
      <span class="label-stack">
        <TransitionGroup name="word">
          <span :key="index" class="word" :lang="WORDS[index]!.lang">{{ WORDS[index]!.text }}</span>
        </TransitionGroup>
      </span>
    </Button>
    <span class="lang-code">{{ WORDS[index]!.lang }}</span>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Button } from 'vael-ui'
import { useLiveCard, useTicker } from './useLiveCard'

// The built-in "Close" label in every language the docs ship.
const WORDS = [
  { lang: 'en', text: 'Close' },
  { lang: 'de', text: 'Schließen' },
  { lang: 'es', text: 'Cerrar' },
  { lang: 'fr', text: 'Fermer' },
  { lang: 'it', text: 'Chiudi' },
  { lang: 'ja', text: '閉じる' },
  { lang: 'pt', text: 'Fechar' },
  { lang: 'zh', text: '关闭' },
] as const

const root = useTemplateRef<HTMLElement>('root')
const { active } = useLiveCard(root)
const index = shallowRef(0)
useTicker(
  () => active.value,
  1600,
  () => (index.value = (index.value + 1) % WORDS.length),
)
</script>

<style scoped>
.i18n-visual {
  display: grid;
  justify-items: center;
  gap: 0.6rem;
}

.close-button {
  pointer-events: none;
  min-inline-size: 7.5rem;
}

.label-stack {
  position: relative;
  display: inline-grid;
}

.word {
  grid-area: 1 / 1;
  text-align: center;
}

.word-enter-active,
.word-leave-active {
  transition:
    opacity 260ms var(--ui-ease-out),
    transform 260ms var(--ui-ease-out),
    filter 260ms var(--ui-ease-out);
}

.word-enter-from {
  opacity: 0;
  transform: translateY(6px);
  filter: blur(4px);
}

.word-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  filter: blur(4px);
}

.lang-code {
  font-family: 'Geist Mono Variable', ui-monospace, monospace;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
  font-variant-numeric: tabular-nums;
}
</style>
