<template>
  <section class="demo">
    <h3>Custom rules</h3>
    <p class="note">
      <code>rules</code> is a list of <code>{'{'} label, test(value) {'}'}</code> objects. Build
      them from whatever already validates the value, such as a Zod or Valibot schema; this demo
      writes them inline.
    </p>
    <PasswordInput
      v-model="custom"
      hint-placement="inline"
      :rules="customRules"
      placeholder="At least one of each"
      autocomplete="new-password"
    />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { PasswordInput } from 'vael-ui'

const custom = shallowRef('')

const customRules = [
  { label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v: string) => /[0-9]/.test(v) },
  { label: 'One symbol', test: (v: string) => /[^a-zA-Z0-9]/.test(v) },
]
</script>
