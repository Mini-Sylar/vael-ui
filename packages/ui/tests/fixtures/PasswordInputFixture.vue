<template>
  <div data-testid="basic">
    <PasswordInput
      ref="basic"
      v-model="value"
      v-model:visible="visible"
      :revealable="revealable"
      :rules="rules"
      :hint-placement="hintPlacement"
    >
      <template v-if="customHint" #hint="{ results }">
        <ul data-testid="custom-hint">
          <li v-for="r in results" :key="r.label" :data-passed="r.passed">{{ r.label }}</li>
        </ul>
      </template>
    </PasswordInput>
  </div>
  <output data-testid="value">{{ value }}</output>
  <output data-testid="visible">{{ String(visible) }}</output>

  <Field label="Password" :error="fieldError">
    <PasswordInput v-model="fieldValue" hint-placement="none" />
  </Field>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import PasswordInput from '../../src/components/PasswordInput/PasswordInput.vue'
import Field from '../../src/components/Field/Field.vue'
import type { PasswordRule } from '../../src/components/PasswordInput/PasswordInput.vue'

withDefaults(
  defineProps<{
    revealable?: boolean
    rules?: PasswordRule[]
    hintPlacement?: 'inline' | 'popover' | 'none'
    customHint?: boolean
    fieldError?: string
  }>(),
  {
    revealable: true,
    // No built-in default in the component (see PasswordInput.vue's own `rules`
    // doc) — this fixture supplies its own, mirroring how a real consumer would.
    // Inlined rather than a named const: withDefaults()'s factory is hoisted
    // outside setup(), so it can't close over a locally-declared script-setup binding.
    rules: () => [
      { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
      { label: 'One number', test: (v: string) => /[0-9]/.test(v) },
      { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
    ],
    hintPlacement: 'inline',
    customHint: false,
    fieldError: undefined,
  },
)

const value = shallowRef('')
const visible = shallowRef(false)
const fieldValue = shallowRef('')
</script>
