<template>
  <section class="demo">
    <h3>Sign up</h3>
    <form class="form" novalidate @submit="handleSubmit">
      <Field label="Email" :error="errors.email">
        <Input v-model="email" v-bind="attrs.email" type="email" autocomplete="email" />
      </Field>
      <Field label="Password" :error="errors.password">
        <Input
          v-model="password"
          v-bind="attrs.password"
          type="password"
          autocomplete="new-password"
        />
      </Field>
      <Button type="submit" :loading="submitting">Create account</Button>
      <p v-if="created" class="done" role="status">Welcome aboard, {{ created }}.</p>
    </form>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { z } from 'zod'
import { useForm } from 'vael-form'
import { Button, Field, Input } from 'vael-ui'

const created = shallowRef('')

const { model, errors, attrs, handleSubmit, submitting } = useForm({
  schema: z.object({ email: z.email(), password: z.string().min(8) }),
  defaultValues: { email: '', password: '' },
  onSubmit: async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 800)) // your API call
    created.value = values.email
  },
})
const { email, password } = model
</script>

<style scoped>
.form {
  display: grid;
  gap: 1rem;
  max-inline-size: 22rem;
}
.done {
  margin: 0;
  color: var(--ui-text-muted);
}
</style>
