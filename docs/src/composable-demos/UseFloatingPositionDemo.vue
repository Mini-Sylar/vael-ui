<template>
  <section class="demo">
    <Button ref="triggerRef" variant="outline" @click="open = !open">
      {{ open ? 'Hide' : 'Show' }} floating box
    </Button>
    <div v-if="open" ref="floatingEl" class="floating-box" :style="positionerStyle">
      Anchored via useFloatingPosition — no Popover involved.
      <p class="floating-meta">placement: {{ placement }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { Button, useFloatingPosition } from 'vael-ui'

const open = shallowRef(false)
const triggerRef = useTemplateRef('triggerRef')
const floatingEl = useTemplateRef<HTMLElement>('floatingEl')

// Button exposes its real element via `.el` — same unwrap contract
// useFloatingPosition documents for any component-shaped reference.
const referenceEl = computed(() => triggerRef.value?.el ?? null)

const { positionerStyle, placement } = useFloatingPosition({
  referenceEl,
  floatingEl,
  active: open,
  side: 'bottom',
  align: 'start',
  sideOffset: 8,
})
</script>

<style scoped>
.demo {
  display: flex;
}

.floating-box {
  z-index: 10;
  inline-size: 16rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  background: var(--ui-surface);
  box-shadow: var(--ui-panel-shadow);
  font-size: 0.85rem;
}

.floating-meta {
  margin: 0.5rem 0 0;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}
</style>
