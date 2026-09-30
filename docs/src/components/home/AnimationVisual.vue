<template>
  <div ref="root" class="animation-visual">
    <div class="hooks">
      <span
        v-for="(hook, i) in HOOKS"
        :key="hook.name"
        class="hook"
        :class="{ 'hook--on': i === step }"
      >
        {{ hook.name }}
      </span>
    </div>
    <div class="stage">
      <div
        class="panel"
        :class="`panel--${HOOKS[step]!.effect}`"
        :data-shown="shown || undefined"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef, watch } from 'vue'
import { useLiveCard, useTicker } from './useLiveCard'

// Each hook gets its own entrance so the three read as different handles on
// the same panel: the built-in CSS fade, a consumer-owned slide, a spring pop.
const HOOKS = [
  { name: 'motionCss', effect: 'fade' },
  { name: 'forceMount', effect: 'slide' },
  { name: 'beforeClose', effect: 'pop' },
] as const

const root = useTemplateRef<HTMLElement>('root')
const { active, reduced } = useLiveCard(root)
const step = shallowRef(0)
const shown = shallowRef(true)

// Hide, switch hook, show: one beat per hook.
useTicker(
  () => active.value,
  1800,
  () => {
    shown.value = false
    setTimeout(() => {
      step.value = (step.value + 1) % HOOKS.length
      shown.value = true
    }, 450)
  },
)
watch(reduced, (value) => value && (shown.value = true), { immediate: true })
</script>

<style scoped>
.animation-visual {
  display: grid;
  justify-items: center;
  gap: 0.85rem;
}

.hooks {
  display: flex;
  gap: 0.35rem;
}

.hook {
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-family: 'Geist Mono Variable', ui-monospace, monospace;
  font-size: 0.7rem;
  color: var(--ui-text-muted);
  background: color-mix(in oklch, var(--ui-text) 6%, transparent);
  transition:
    color 200ms var(--ui-ease-out),
    background-color 200ms var(--ui-ease-out);
}

.hook--on {
  color: color-mix(in oklch, var(--docs-accent, var(--ui-info)) 80%, var(--ui-text));
  background: color-mix(in oklch, var(--docs-accent, var(--ui-info)) 16%, transparent);
}

.stage {
  display: grid;
  place-items: center;
  inline-size: 9rem;
  block-size: 3.2rem;
}

.panel {
  inline-size: 100%;
  block-size: 100%;
  border-radius: 10px;
  background: var(--ui-surface);
  box-shadow:
    0 0 0 1px var(--ui-border),
    0 4px 14px -6px color-mix(in oklch, black 25%, transparent);
  opacity: 0;
}

.panel[data-shown] {
  opacity: 1;
  transform: none;
}

.panel--fade {
  transition: opacity 300ms var(--ui-ease-out);
}

.panel--slide {
  transform: translateY(10px);
  transition:
    opacity 320ms var(--ui-ease-out),
    transform 320ms var(--ui-ease-out);
}

.panel--pop {
  transform: scale(0.9);
  /* A soft overshoot approximating a spring. */
  transition:
    opacity 260ms var(--ui-ease-out),
    transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (prefers-reduced-motion: reduce) {
  .panel {
    transition: none !important;
  }
}
</style>
