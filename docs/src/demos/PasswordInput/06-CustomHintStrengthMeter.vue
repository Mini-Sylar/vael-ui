<template>
  <section class="demo">
    <h3>Custom <code>#hint</code> content: a strength meter</h3>
    <p class="note">
      The checklist is only the default. Replace it entirely via the <code>#hint</code> slot — a
      <code>Progress</code> bar driven by <code>results</code>, no bespoke widget.
    </p>
    <PasswordInput
      v-model="strength"
      hint-placement="inline"
      placeholder="Strength meter"
      autocomplete="new-password"
    >
      <template #hint="{ results }">
        <div class="password-strength">
          <Progress :value="strengthValue(results)" :variant="strengthVariant(results)" size="sm" />
          <span class="password-strength-label">{{ strengthLabel(results) }}</span>
        </div>
      </template>
    </PasswordInput>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { PasswordInput, Progress } from 'vael-ui'
import type { PasswordRuleResult } from 'vael-ui'

const strength = shallowRef('')

function strengthValue(results: PasswordRuleResult[]): number {
  const passed = results.filter((r) => r.passed).length
  return results.length === 0 ? 0 : Math.round((passed / results.length) * 100)
}
function strengthVariant(results: PasswordRuleResult[]): 'danger' | 'warning' | 'success' {
  const value = strengthValue(results)
  if (value >= 100) return 'success'
  if (value >= 50) return 'warning'
  return 'danger'
}
function strengthLabel(results: PasswordRuleResult[]): string {
  const value = strengthValue(results)
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
  max-inline-size: 20rem;
  margin-block-start: 0.5rem;
}
/* Not .note — that class is the docs shell's own name for maintainer-facing
   commentary and is hidden globally (.demo .note { display: none }), which
   silently ate this label too. */
.password-strength-label {
  color: var(--ui-text-muted);
  font-size: 0.9rem;
}
</style>
