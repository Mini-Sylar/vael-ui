<template>
  <section class="demo">
    <h3><code>side</code> in inline mode</h3>
    <p class="note">
      In <code>hintPlacement="popover"</code>, <code>side</code> is floating-ui's own side. In
      <code>"inline"</code> it drives the flex layout instead — same prop, no separate one needed.
    </p>
    <div class="example-grid example-grid--1">
      <div class="example">
        <span class="example-label">side="bottom" (default)</span>
        <PasswordInput
          v-model="sideBottom"
          :rules="DEFAULT_RULES"
          hint-placement="inline"
          side="bottom"
          placeholder="Password"
          autocomplete="new-password"
        />
      </div>
      <div class="example">
        <span class="example-label">side="top"</span>
        <PasswordInput
          v-model="sideTop"
          :rules="DEFAULT_RULES"
          hint-placement="inline"
          side="top"
          placeholder="Password"
          autocomplete="new-password"
        />
      </div>
      <div class="example">
        <span class="example-label">side="left"</span>
        <PasswordInput
          v-model="sideLeft"
          :rules="DEFAULT_RULES"
          hint-placement="inline"
          side="left"
          placeholder="Password"
          autocomplete="new-password"
        />
      </div>
      <div class="example">
        <span class="example-label">side="right"</span>
        <PasswordInput
          v-model="sideRight"
          :rules="DEFAULT_RULES"
          hint-placement="inline"
          side="right"
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

const sideBottom = shallowRef('')
const sideTop = shallowRef('')
const sideLeft = shallowRef('')
const sideRight = shallowRef('')
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
</style>
