<template>
  <section class="demo">
    <h2>"Password with hint" — a block, not a component</h2>
    <p class="note">
      PrimeVue ships a dedicated <code>Password</code> component — Input + a visibility toggle + a
      strength meter bundled together. In vael-ui's worldview that bundle is a composition, not a
      new primitive: <code>Input</code>'s <code>#end</code> slot + a ghost icon
      <code>Button</code> toggling <code>type</code> + <code>Field</code>'s
      <code>description</code>/<code>error</code>
      covers the whole shape with zero new behavior. The strength meter below is literally
      <code>Progress</code> driven by a computed value — no bespoke widget.
    </p>

    <Field
      label="Password"
      label-placement="float"
      description="At least 8 characters, one number."
      :error="error"
    >
      <Input
        v-model="password"
        :type="visible ? 'text' : 'password'"
        :invalid="!!error"
        autocomplete="new-password"
      >
        <template #end>
          <Button
            size="sm"
            variant="ghost"
            icon
            :aria-label="visible ? 'Hide password' : 'Show password'"
            @click="visible = !visible"
          >
            <svg
              v-if="visible"
              viewBox="0 0 16 16"
              width="14"
              height="14"
              aria-hidden="true"
              fill="none"
            >
              <path
                d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z"
                stroke="currentColor"
                stroke-width="1.4"
              />
              <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.4" />
            </svg>
            <svg v-else viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none">
              <path
                d="M2 2l12 12M4.2 4.6C2.4 5.7 1 8 1 8s2.5 4.5 7 4.5c1.4 0 2.6-.4 3.6-1M10.6 3.9C9.8 3.6 8.9 3.5 8 3.5c-.6 0-1.2.06-1.7.18M12.9 6.1c1 .8 2.1 1.9 2.1 1.9s-.6 1.1-1.7 2.1"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
              />
            </svg>
          </Button>
        </template>
      </Input>
    </Field>

    <div class="password-strength">
      <Progress :value="strength" :variant="strengthVariant" size="sm" :label="strengthLabel" />
      <span class="note">{{ strengthLabel }}</span>
    </div>

    <div class="row">
      <Button size="sm" variant="outline" @click="error = error ? '' : 'Password is too short'">
        Toggle error
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Button, Field, Input, Progress } from 'vael-ui'

const password = shallowRef('')
const visible = shallowRef(false)
const error = shallowRef('')

const strength = computed(() => {
  const value = password.value
  if (!value) return 0
  let score = Math.min(value.length * 8, 60)
  if (/[0-9]/.test(value)) score += 20
  if (/[^a-zA-Z0-9]/.test(value)) score += 20
  return Math.min(score, 100)
})
const strengthVariant = computed(() => {
  if (strength.value >= 80) return 'success'
  if (strength.value >= 40) return 'warning'
  return 'danger'
})
const strengthLabel = computed(() => {
  if (!password.value) return 'Enter a password'
  if (strength.value >= 80) return 'Strong'
  if (strength.value >= 40) return 'Okay'
  return 'Weak'
})
</script>

<style scoped>
.password-strength {
  display: grid;
  gap: 0.375rem;
  max-width: 20rem;
  margin-block: 0.75rem;
}
</style>
