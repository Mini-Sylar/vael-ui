<template>
  <section class="demo">
    <Button ref="triggerRef" variant="outline" :loading="false" @click="onRemoveTag">
      <template #leading><PhTag weight="bold" /></template>
      urgent ×
    </Button>
    <p class="demo-status">
      Last result: <strong>{{ lastResult }}</strong
      ><br />
      Live queue (<code>usePopoverQueue()</code>): <strong>{{ queue.length }}</strong> open
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { openPopover, usePopoverQueue, Button } from 'vael-ui'
import RemoveTagPopoverBody from './RemoveTagPopoverBody.vue'
import { PhTag } from '@phosphor-icons/vue'

// The same reactive queue <PopoverHost/> renders from.
const queue = usePopoverQueue()
const lastResult = shallowRef('none yet')
const triggerRef = useTemplateRef('triggerRef')

// :loading="false" opts the trigger out of Button's own loading="auto":
// the awaited promise here spans the whole popover interaction, not just a
// real request, so auto-detecting it as "loading" would be wrong.
async function onRemoveTag() {
  const confirmed = await openPopover<void, boolean>(RemoveTagPopoverBody, {
    triggerEl: triggerRef.value!.el!,
  }).result
  lastResult.value = confirmed === undefined ? 'dismissed' : String(confirmed)
}
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.demo-status {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
</style>
