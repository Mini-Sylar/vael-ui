<template>
  <section class="demo">
    <h3>Async checks</h3>
    <form class="form" novalidate @submit="handleSubmit">
      <Field label="Username" :error="errors.username">
        <Input v-model="username" v-bind="attrs.username" :loading="pending" />
      </Field>
      <Button type="submit">Claim it</Button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { useForm } from 'vael-form'
import { Button, Field, Input } from 'vael-ui'

// Stands in for your API.
async function isTaken(name: string, signal: AbortSignal) {
  await new Promise((resolve) => setTimeout(resolve, 600))
  signal.throwIfAborted()
  return ['admin', 'vael'].includes(name.toLowerCase())
}

const { model, errors, attrs, handleSubmit, pending } = useForm({
  schema: z.object({ username: z.string().min(3).max(20) }),
  defaultValues: { username: '' },
  showErrors: 'input',
  debounce: 300,
  rules: {
    username: async (value, { signal }) =>
      (await isTaken(value, signal)) ? 'That username is taken' : undefined,
  },
  onSubmit: () => {},
})
const { username } = model
</script>

<style scoped>
.form {
  display: grid;
  gap: 1rem;
  max-inline-size: 22rem;
}
</style>
