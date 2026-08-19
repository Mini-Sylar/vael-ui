<template>
  <section class="demo">
    <h2>PasswordInput</h2>
    <p class="note">
      Promoted out of the old hand-composed block into a real component: reveal toggle +
      <code>Field</code> wiring come for free. Default <code>hintPlacement="popover"</code> floats
      the requirements checklist next to the field while it's focused — click into the field below
      to see it.
    </p>
    <PasswordInput
      v-model="basic"
      :rules="defaultRules"
      placeholder="Focus me"
      autocomplete="new-password"
    />

    <p class="note">
      <code>hintPlacement="inline"</code> instead keeps it always visible, and here the checklist is
      swapped for a strength meter via the <code>#hint</code> slot — still just
      <code>Progress</code> driven by a computed value, no bespoke widget.
    </p>
    <Field label="Password" label-placement="float" :error="error">
      <PasswordInput
        v-model="password"
        hint-placement="inline"
        :invalid="!!error"
        autocomplete="new-password"
      >
        <template #hint="{ results }">
          <div class="password-strength">
            <Progress :value="strength(results)" :variant="strengthVariant(results)" size="sm" />
            <span class="note">{{ strengthLabel(results) }}</span>
          </div>
        </template>
      </PasswordInput>
    </Field>

    <div class="row">
      <Button size="sm" variant="outline" @click="error = error ? '' : 'Password is too short'">
        Toggle error
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Field, PasswordInput, Progress } from 'vael-ui'
import type { PasswordRule, PasswordRuleResult } from 'vael-ui'

// No built-in default in the component — labels are user-facing text with no i18n
// context inside PasswordInput to translate them from, so this demo supplies its own.
const defaultRules: PasswordRule[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One number', test: (v) => /[0-9]/.test(v) },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
]

const basic = shallowRef('')
const password = shallowRef('')
const error = shallowRef('')

function strength(results: PasswordRuleResult[]): number {
  const passed = results.filter((r) => r.passed).length
  return results.length === 0 ? 0 : Math.round((passed / results.length) * 100)
}
function strengthVariant(results: PasswordRuleResult[]): 'danger' | 'warning' | 'success' {
  const value = strength(results)
  if (value >= 100) return 'success'
  if (value >= 50) return 'warning'
  return 'danger'
}
function strengthLabel(results: PasswordRuleResult[]): string {
  const value = strength(results)
  if (value === 0) return 'Enter a password'
  if (value >= 100) return 'Strong'
  if (value >= 50) return 'Okay'
  return 'Weak'
}
</script>

<style scoped>
.password-strength {
  display: grid;
  gap: 0.375rem;
  max-width: 20rem;
  margin-block: 0.75rem;
}
</style>
