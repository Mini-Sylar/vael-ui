<template>
  <section class="demo">
    <h2>PasswordInput</h2>
    <p class="note">
      Composes <code>Input</code>: the frame, focus ring, and Field wiring are Input's own. Owns the
      reveal toggle and <em>where</em> a requirements hint renders (inline, in a popover, or not at
      all) — not <em>what</em> it says. The rule set is yours (a schema-validation library probably
      already expresses it), passed via <code>rules</code>; the default below is deliberately
      generic.
    </p>

    <h3>Basic usage</h3>
    <p class="note">
      Default <code>hintPlacement="popover"</code>: the checklist appears while focused, next to the
      field, and doesn't shift anything else on the page.
    </p>
    <PasswordInput
      v-model="basic"
      :rules="DEFAULT_RULES"
      placeholder="Password"
      autocomplete="new-password"
    />

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

    <h3><code>align</code> in inline mode</h3>
    <p class="note">
      Same idea as <code>side</code> — cross-axis alignment of the hint relative to the input,
      instead of floating-ui's own align. Fields below are widened so the (narrower) hint block
      actually has room to move.
    </p>
    <div class="example-grid example-grid--1">
      <div class="example">
        <span class="example-label">align="start" (default)</span>
        <PasswordInput
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

    <h3>Custom rules</h3>
    <p class="note">
      <code>rules</code> is just <code>{'{'} label, test(value) {'}'}</code> pairs — derive them
      from whatever already validates the value (a Zod/Valibot schema's own checks, here just
      inlined for the demo).
    </p>
    <PasswordInput
      v-model="custom"
      hint-placement="inline"
      :rules="customRules"
      placeholder="At least one of each"
      autocomplete="new-password"
    />

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

    <h3><code>revealable=false</code></h3>
    <p class="note">For forms that never want the value shown in plain text.</p>
    <PasswordInput
      v-model="hidden"
      :revealable="false"
      hint-placement="none"
      placeholder="Never revealed"
      autocomplete="new-password"
    />

    <h3>Inside a Field, with validation</h3>
    <Field label="Password" description="At least 8 characters, one number." :error="fieldError">
      <PasswordInput v-model="fieldPassword" hint-placement="none" autocomplete="new-password" />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Field, PasswordInput, Progress } from 'vael-ui'
import type { PasswordRule, PasswordRuleResult } from 'vael-ui'

// No built-in default in the component — labels are user-facing text with no i18n
// context inside PasswordInput to translate them from, so this demo supplies its own.
const DEFAULT_RULES: PasswordRule[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One number', test: (v) => /[0-9]/.test(v) },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
]

const basic = shallowRef('')
const inline = shallowRef('')
const popover = shallowRef('')
const none = shallowRef('')
const sideBottom = shallowRef('')
const sideTop = shallowRef('')
const sideLeft = shallowRef('')
const sideRight = shallowRef('')
const alignStart = shallowRef('')
const alignCenter = shallowRef('')
const alignEnd = shallowRef('')
const custom = shallowRef('')
const strength = shallowRef('')
const hidden = shallowRef('')
const fieldPassword = shallowRef('')

const customRules = [
  { label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v: string) => /[0-9]/.test(v) },
  { label: 'One symbol', test: (v: string) => /[^a-zA-Z0-9]/.test(v) },
]

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

const fieldError = computed(() =>
  fieldPassword.value && fieldPassword.value.length < 8 ? 'Too short' : undefined,
)
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

/* A real grid (not the shared .row's flex-wrap) — each variant's own inline
   hint changes its cell's height/shape (top/bottom stack vertically, left/
   right sit side by side), which flex-wrap's default cross-axis centering
   turned into a jagged, uneven-looking row. Grid keeps every cell aligned to
   its own row/column regardless. One column on narrow viewports either way. */
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

/* ui.root lands on PasswordInput's own internal wrapper — a child component's
   DOM, not this template's own, hence :deep(). */
:deep(.wide-field) {
  min-inline-size: 18rem;
}
</style>
