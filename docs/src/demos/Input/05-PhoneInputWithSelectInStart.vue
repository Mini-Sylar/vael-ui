<template>
  <section class="demo">
    <h3>A phone input: fusing a Select into <code>#start</code></h3>
    <p class="note">
      <code>#start</code> is a generic slot, not just a home for icons — nothing stops a full
      interactive control from living there. The Select strips its own border/background and matches
      the frame's own corner radius, so it reads as one continuous field split by a single divider,
      not a button nested inside a box.
    </p>
    <Input v-model="number" placeholder="555 0100" class="phone-input">
      <template #start>
        <Select v-model="code" :items="codes" :ui="{ trigger: 'code-select' }" />
      </template>
    </Input>
    <p class="note">Value: {{ code }} {{ number || '(empty)' }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Input, Select } from 'vael-ui'
import type { SelectItemData } from 'vael-ui'

// No need for a real country list — this is only proving the composition works.
const codes: SelectItemData[] = [
  { label: '+1', value: '+1' },
  { label: '+44', value: '+44' },
  { label: '+91', value: '+91' },
]
const code = shallowRef('+1')
const number = shallowRef('')
</script>

<style scoped>
.phone-input {
  max-width: 16rem;
  padding-inline-start: 0;
}
.phone-input :deep(.ui-input-start) {
  align-self: stretch;
  align-items: stretch;
  margin-inline-end: 0;
}

.phone-input :deep(.code-select) {
  align-self: stretch;
  block-size: 100%;
  border: none;
  border-radius: 0;
  border-start-start-radius: calc(var(--ui-radius) - 2px);
  border-end-start-radius: calc(var(--ui-radius) - 2px);
  border-inline-end: 1px solid var(--ui-border);
  background: transparent;
  padding-inline: 0.75rem 0.625rem;
}
</style>
