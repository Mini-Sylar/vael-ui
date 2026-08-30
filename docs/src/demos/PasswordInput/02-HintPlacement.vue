<template>
  <section class="demo">
    <h3><code>hintPlacement</code>: inline vs popover vs none</h3>
    <p class="note">
      <code>inline</code> stays visible below the field, like <code>Field</code>'s own
      description/error. <code>popover</code> (same as "Basic usage" above, spelled out here
      explicitly) floats it instead, only while focused. <code>none</code> drops the hint entirely —
      just the input and the reveal toggle.
    </p>
    <div class="example-grid example-grid--3">
      <div class="example">
        <span class="example-label">inline</span>
        <PasswordInput
          v-model="inline"
          :rules="DEFAULT_RULES"
          hint-placement="inline"
          placeholder="Inline hint"
          autocomplete="new-password"
        />
      </div>
      <div class="example">
        <span class="example-label">popover</span>
        <PasswordInput
          v-model="popover"
          :rules="DEFAULT_RULES"
          hint-placement="popover"
          placeholder="Popover hint"
          autocomplete="new-password"
        />
      </div>
      <div class="example">
        <span class="example-label">none</span>
        <PasswordInput
          v-model="none"
          hint-placement="none"
          placeholder="No hint"
          autocomplete="new-password"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { PasswordInput } from 'vael-ui'
import type { PasswordRule } from 'vael-ui'

const DEFAULT_RULES: PasswordRule[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One number', test: (v) => /[0-9]/.test(v) },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
]

const inline = shallowRef('')
const popover = shallowRef('')
const none = shallowRef('')
</script>

<style scoped>
.example-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.75rem 2rem;
}
@media (min-width: 640px) {
  .example-grid--3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.example {
  display: grid;
  gap: 0.5rem;
  align-content: start;
}
.example-label {
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}
</style>
