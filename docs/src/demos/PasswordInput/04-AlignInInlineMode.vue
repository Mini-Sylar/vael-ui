<template>
  <section class="demo">
    <h3><code>align</code> in inline mode</h3>
    <p class="note">
      Like <code>side</code>, <code>align</code> lays out the inline hint instead of the floating
      one: it aligns the hint along the input's other axis. The fields are wider here so the
      narrower hint has room to move.
    </p>
    <div class="example-grid example-grid--1">
      <div class="example">
        <span class="example-label">align="start" (default)</span>
        <PasswordInput
          style="max-inline-size: 20rem"
          v-model="alignStart"
          :ui="{ root: 'wide-field' }"
          :rules="DEFAULT_RULES"
          hint-placement="inline"
          align="start"
          placeholder="Password"
          autocomplete="new-password"
        />
      </div>
      <div class="example">
        <span class="example-label">align="center"</span>
        <PasswordInput
          style="max-inline-size: 20rem"
          v-model="alignCenter"
          :ui="{ root: 'wide-field' }"
          :rules="DEFAULT_RULES"
          hint-placement="inline"
          align="center"
          placeholder="Password"
          autocomplete="new-password"
        />
      </div>
      <div class="example">
        <span class="example-label">align="end"</span>
        <PasswordInput
          style="max-inline-size: 20rem"
          v-model="alignEnd"
          :ui="{ root: 'wide-field' }"
          :rules="DEFAULT_RULES"
          hint-placement="inline"
          align="end"
          placeholder="Password"
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

const alignStart = shallowRef('')
const alignCenter = shallowRef('')
const alignEnd = shallowRef('')
</script>

<style scoped>
.example-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.75rem 2rem;
}
@media (min-width: 640px) {
  .example-grid--1 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
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

:deep(.wide-field) {
  min-inline-size: 18rem;
}
</style>
