<template>
  <section class="demo">
    <h3>Plain functions</h3>
    <form class="form" novalidate @submit="handleSubmit">
      <Field label="Email" :error="errors.email">
        <Input v-model="email" v-bind="attrs.email" type="email" />
      </Field>
      <Field label="Age" :error="errors.age">
        <InputNumber v-model="age" v-bind="attrs.age" />
      </Field>
      <Button type="submit">Join</Button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { useForm } from 'vael-form'
import { Button, Field, Input, InputNumber } from 'vael-ui'

// Rules you write once and share: a message when it fails, nothing when it passes.
const required = (value: unknown) => (value === '' || value == null ? 'Required' : undefined)
const isEmail = (value: string) =>
  !value || /^\S+@\S+\.\S+$/.test(value) ? undefined : 'Not an email'
const atLeast = (min: number) => (value: number | null) =>
  value == null || value >= min ? undefined : `At least ${min}`

const { model, errors, attrs, handleSubmit } = useForm({
  defaultValues: { email: '', age: null as number | null },
  validate: {
    email: [required, isEmail], // in order: the first to fail is the error
    age: [required, atLeast(18)],
  },
  onSubmit: () => {},
})
const { email, age } = model
</script>

<style scoped>
.form {
  display: grid;
  gap: 1rem;
  max-inline-size: 22rem;
}
</style>
