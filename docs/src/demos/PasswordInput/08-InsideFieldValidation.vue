<template>
  <section class="demo">
    <h3>Inside a Field, with validation</h3>
    <Field label="Password" description="At least 8 characters, one number." :error="fieldError">
      <PasswordInput v-model="fieldPassword" hint-placement="none" autocomplete="new-password" />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Field, PasswordInput } from 'vael-ui'

const fieldPassword = shallowRef('')

const fieldError = computed(() =>
  fieldPassword.value && fieldPassword.value.length < 8 ? 'Too short' : undefined,
)
</script>
