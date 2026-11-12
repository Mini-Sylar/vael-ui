<template>
  <section class="demo">
    <h3>Rules across fields</h3>
    <form class="form" novalidate @submit="handleSubmit">
      <Field label="New password" :error="errors.password">
        <Input
          v-model="password"
          v-bind="attrs.password"
          type="password"
          autocomplete="new-password"
        />
      </Field>
      <Field label="Confirm password" :error="errors.confirm">
        <Input
          v-model="confirm"
          v-bind="attrs.confirm"
          type="password"
          autocomplete="new-password"
        />
      </Field>
      <Button type="submit">Change password</Button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { useForm } from 'vael-form'
import { Button, Field, Input } from 'vael-ui'

const { model, errors, attrs, handleSubmit } = useForm({
  schema: z
    .object({ password: z.string().min(8), confirm: z.string() })
    .refine((value) => value.password === value.confirm, {
      path: ['confirm'], // the field that shows the error
      message: 'Passwords don’t match',
    }),
  defaultValues: { password: '', confirm: '' },
  onSubmit: () => {},
})
const { password, confirm } = model
</script>

<style scoped>
.form {
  display: grid;
  gap: 1rem;
  max-inline-size: 22rem;
}
</style>
