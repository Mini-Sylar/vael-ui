<!-- The playgrounds' anatomy toggle: outline the component's parts and list them under the stage. -->
<template>
  <span class="anatomy-toggle">
    <Button
      v-model:pressed="shown"
      variant="ghost"
      size="sm"
      icon
      aria-label="Anatomy"
      v-tooltip="'Anatomy'"
    >
      <PhBoundingBox :size="15" aria-hidden="true" />
    </Button>
    <!-- Once, on the first playground you open: where to find it. -->
    <p v-if="hint" v-animate.rise class="anatomy-toggle-hint" role="status">See its parts</p>
  </span>
</template>

<script setup lang="ts">
import { onMounted, shallowRef, watch } from 'vue'
import { Button, vAnimate } from 'vael-ui'
import { PhBoundingBox } from '@phosphor-icons/vue'

const shown = defineModel<boolean>('shown', { default: false })

const HINT_KEY = 'vael-docs-anatomy-hint'
const hint = shallowRef(false)
watch(shown, () => (hint.value = false))
onMounted(() => {
  try {
    if (localStorage.getItem(HINT_KEY)) return
    localStorage.setItem(HINT_KEY, '1')
  } catch {
    return
  }
  setTimeout(() => (hint.value = true), 700)
  setTimeout(() => (hint.value = false), 6500)
})
</script>

<style scoped>
.anatomy-toggle {
  position: relative;
  display: inline-flex;
}
/* Quiet like the stage's other tools: muted until hovered or on. */
.anatomy-toggle :deep(.ui-button) {
  color: var(--ui-text-muted);
}
.anatomy-toggle :deep(.ui-button[aria-pressed='true']) {
  color: var(--ui-text);
}
@media (hover: hover) and (pointer: fine) {
  .anatomy-toggle :deep(.ui-button:hover) {
    color: var(--ui-text);
  }
}
/* A small note under the button, its arrow pointing up at it. */
.anatomy-toggle-hint {
  position: absolute;
  inset-block-start: calc(100% + 0.5rem);
  inset-inline-end: 0;
  z-index: 4;
  margin: 0;
  padding: 0.375rem 0.625rem;
  border-radius: 6px;
  background: var(--ui-text);
  color: var(--ui-surface);
  font-size: 0.75rem;
  white-space: nowrap;
  pointer-events: none;
}
.anatomy-toggle-hint::before {
  content: '';
  position: absolute;
  inset-block-end: 100%;
  inset-inline-end: 0.75rem;
  border: 5px solid transparent;
  border-block-end-color: var(--ui-text);
}
</style>
