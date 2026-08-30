<template>
  <section class="demo">
    <h3>A phone input: fusing a Select into <code>#start</code></h3>
    <p class="note">
      <code>#start</code> is a generic slot, not just a home for icons — nothing stops a full
      interactive control from living there. The Select strips its own border/background and matches
      the frame's own corner radius, so it reads as one continuous field split by a single divider,
      not a button nested inside a box. With a real-sized country list, <code>filter</code> is what
      makes picking one by typing actually usable, rather than scrolling a 30-row list.
    </p>
    <Input v-model="number" placeholder="555 0100" class="phone-input">
      <template #start>
        <Select v-model="code" :items="codes" filter :ui="{ trigger: 'code-select' }">
          <template #value="{ selected }">
            {{ Array.isArray(selected) ? '' : (selected?.value ?? '') }}
          </template>
        </Select>
      </template>
    </Input>
    <p class="note">Value: {{ code }} {{ number || '(empty)' }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Input, Select } from 'vael-ui'
import type { SelectItemData } from 'vael-ui'

// Label carries the country name so `filter` can match on it — the trigger's own
// `#value` slot below shows just the dial code, so the field itself stays compact.
const codes: SelectItemData[] = [
  { label: 'Ghana +233', value: '+233' },
  { label: 'Nigeria +234', value: '+234' },
  { label: 'Kenya +254', value: '+254' },
  { label: 'South Africa +27', value: '+27' },
  { label: 'Egypt +20', value: '+20' },
  { label: "Côte d'Ivoire +225", value: '+225' },
  { label: 'Senegal +221', value: '+221' },
  { label: 'United States +1', value: '+1' },
  { label: 'Canada +1', value: '+1-ca' },
  { label: 'Mexico +52', value: '+52' },
  { label: 'Brazil +55', value: '+55' },
  { label: 'United Kingdom +44', value: '+44' },
  { label: 'France +33', value: '+33' },
  { label: 'Germany +49', value: '+49' },
  { label: 'Spain +34', value: '+34' },
  { label: 'Türkiye +90', value: '+90' },
  { label: 'India +91', value: '+91' },
  { label: 'China +86', value: '+86' },
  { label: 'Japan +81', value: '+81' },
  { label: 'Australia +61', value: '+61' },
]
const code = shallowRef('+233')
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
