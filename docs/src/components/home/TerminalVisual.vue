<template>
  <div ref="root" class="terminal">
    <div class="terminal-bar"><i /><i /><i /></div>
    <div class="terminal-body">
      <div class="line">
        <span class="prompt">$</span>
        <span>{{ typed }}</span>
        <span v-if="!done" class="caret" />
      </div>
      <div
        v-for="(line, i) in output"
        :key="i"
        class="line out"
        :class="{ 'out--shown': done }"
        :style="{ '--i': i }"
      >
        <span class="ok">✓</span> {{ line }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import { useLiveCard } from './useLiveCard'

const props = defineProps<{ command: string; output: string[] }>()

const root = useTemplateRef<HTMLElement>('root')
const { active, reduced, visible } = useLiveCard(root)
const count = shallowRef(0)
const typed = computed(() => props.command.slice(0, count.value))
const done = computed(() => count.value >= props.command.length)

// Types the command once, the first time the card is on screen.
let timer: ReturnType<typeof setInterval> | undefined
watch(
  [active, reduced, visible],
  ([isActive, isReduced, isVisible]) => {
    if (isReduced && isVisible) count.value = props.command.length
    if (!isActive || done.value || timer) return
    timer = setInterval(() => {
      count.value++
      if (done.value) clearInterval(timer)
    }, 38)
  },
  { immediate: true },
)
</script>

<style scoped>
.terminal {
  inline-size: min(100%, 22rem);
  border-radius: 10px;
  background: #0b0b0e;
  color: #e4e4e7;
  box-shadow:
    0 0 0 1px color-mix(in oklch, white 8%, transparent),
    0 8px 24px -12px color-mix(in oklch, black 50%, transparent);
  overflow: hidden;
  font-family: 'Geist Mono Variable', ui-monospace, monospace;
  font-size: 0.72rem;
}

.terminal-bar {
  display: flex;
  gap: 5px;
  padding: 7px 9px;
  border-block-end: 1px solid color-mix(in oklch, white 7%, transparent);
}

.terminal-bar i {
  inline-size: 8px;
  block-size: 8px;
  border-radius: 50%;
  background: color-mix(in oklch, white 18%, transparent);
}

.terminal-body {
  display: grid;
  gap: 0.3rem;
  padding: 0.6rem 0.75rem 0.75rem;
}

.line {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prompt {
  margin-inline-end: 0.5ch;
  color: #71717a;
}

.caret {
  display: inline-block;
  inline-size: 0.5ch;
  block-size: 1em;
  margin-inline-start: 1px;
  vertical-align: -0.15em;
  background: currentColor;
  animation: blink 1s steps(1) infinite;
}

.out {
  color: #a1a1aa;
  opacity: 0;
  transform: translateY(3px);
  transition:
    opacity 240ms var(--ui-ease-out),
    transform 240ms var(--ui-ease-out);
  transition-delay: calc(var(--i) * 140ms + 120ms);
}

.out--shown {
  opacity: 1;
  transform: none;
}

.ok {
  color: #4ade80;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .caret {
    animation: none;
  }

  .out {
    transition: none;
  }
}
</style>
