<!-- BottomSheet with every part, open inside its own box: overlay, handle, header (title and close) and content. -->
<template>
  <div data-specimen class="specimen">
    <!-- The sheet's container: its overlay, scroll lock and focus trap stay inside this box. -->
    <div ref="box" class="box">
      <div class="page">
        <strong>Q3 report</strong>
        <span>Shared with 4 people</span>
      </div>
      <BottomSheet
        v-model:open="open"
        :container="box"
        :snap-points="[{ id: 'open', height: 0.7 }]"
        title="Share"
      >
        <ul class="options">
          <li v-for="option in options" :key="option.label">
            <component :is="option.icon" :size="18" aria-hidden="true" />
            {{ option.label }}
          </li>
        </ul>
      </BottomSheet>
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { BottomSheet } from 'vael-ui'
import { PhEnvelopeSimple, PhLink, PhUserPlus } from '@phosphor-icons/vue'

const box = useTemplateRef<HTMLElement>('box')
const open = shallowRef(true)
const options = [
  { label: 'Copy link', icon: PhLink },
  { label: 'Send by email', icon: PhEnvelopeSimple },
  { label: 'Invite Ada Lovelace', icon: PhUserPlus },
]
</script>

<style scoped>
.specimen {
  inline-size: min(26rem, 100%);
}

.box {
  position: relative;
  overflow: hidden;
  block-size: 21rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  background: var(--ui-surface);
}

/* A page behind the overlay, so the sheet reads as on top of something. */
.page {
  display: grid;
  gap: 0.375rem;
  padding: 1rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}

.page strong {
  color: var(--ui-text);
}

.options {
  display: grid;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.875rem;
}

.options li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
}
</style>
