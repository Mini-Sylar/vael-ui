<!-- PasswordInput with every part: the field, the reveal toggle, and the inline hint of rules. -->
<template>
  <div data-specimen class="specimen">
    <PasswordInput
      v-model="password"
      :rules="rules"
      hint-placement="inline"
      aria-label="New password"
    />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { PasswordInput } from 'vael-ui'

const password = shallowRef('lovelace1843')
// Two met, one not: both looks of a hint item.
const rules = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'A number', test: (v: string) => /\d/.test(v) },
  { label: 'An uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
]
</script>

<style scoped>
.specimen {
  inline-size: min(20rem, 100%);
}
</style>
