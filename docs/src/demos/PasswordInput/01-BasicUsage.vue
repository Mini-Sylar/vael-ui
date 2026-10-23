<template>
  <section class="demo">
    <h3>Basic usage</h3>
    <p class="note">
      With the default <code>hintPlacement="popover"</code>, the checklist shows next to the field
      while it's focused, without moving anything else on the page.
    </p>
    <PasswordInput
      v-model="basic"
      :rules="DEFAULT_RULES"
      placeholder="Password"
      autocomplete="new-password"
    />
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

const basic = shallowRef('')
</script>
