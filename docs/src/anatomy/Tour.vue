<!-- Tour open on its first step inside its own box: the spotlight on a button, and the callout's positioner and panel. -->
<template>
  <div data-specimen class="specimen">
    <!-- The tour's container: its spotlight, scroll lock and inert stay inside this box. -->
    <div ref="box" class="box">
      <div class="toolbar">
        <strong>Team plan</strong>
        <Button id="specimen-tour-invite" size="sm">
          <template #leading><PhUserPlus :size="14" aria-hidden="true" /></template>
          Invite
        </Button>
      </div>
      <Tour v-model:open="open" :steps="steps" :container="box" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Button, Tour } from 'vael-ui'
import type { TourStep } from 'vael-ui'
import { PhUserPlus } from '@phosphor-icons/vue'

const box = useTemplateRef<HTMLElement>('box')
const open = shallowRef(true)
const steps: TourStep[] = [
  {
    target: '#specimen-tour-invite',
    group: 'Basics',
    side: 'bottom',
    align: 'end',
    title: 'Invite your team',
    description: 'Ada Lovelace and the rest join by email.',
  },
  { target: '#specimen-tour-invite', group: 'Billing', title: 'Billing email' },
]
</script>

<style scoped>
.specimen {
  inline-size: min(26rem, 100%);
}

.box {
  position: relative;
  overflow: hidden;
  block-size: 16rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  background: var(--ui-surface);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-block-end: 1px solid var(--ui-border);
  font-size: 0.875rem;
}
</style>
