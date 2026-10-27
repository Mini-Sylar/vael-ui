<template>
  <section class="demo">
    <h3>Validation with vee-validate</h3>
    <p class="note">
      vee-validate holds the values and errors, and Field shows them. Pass each field’s error to
      <code>error</code>, and set <code>invalid</code> on its control. A field is checked when you
      leave it, then on every change until it’s valid. Submitting checks every field.
    </p>
    <form class="form" novalidate @submit="onSubmit">
      <Field label="Name" :error="errors.name" required>
        <Input v-model="name" v-bind="nameAttrs" autocomplete="name" :invalid="!!errors.name" />
      </Field>
      <Field label="Email" :error="errors.email" required>
        <Input
          v-model="email"
          v-bind="emailAttrs"
          type="email"
          autocomplete="email"
          :invalid="!!errors.email"
        />
      </Field>
      <div class="actions">
        <Button type="submit" :loading="isSubmitting">Create account</Button>
      </div>
      <p class="demo-status" aria-live="polite">{{ status }}</p>
    </form>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { useForm } from 'vee-validate'
import { Button, Field, Input } from 'vael-ui'

// One function per field: return true when the value is valid, or the message to show.
const { errors, defineField, handleSubmit, isSubmitting } = useForm({
  validationSchema: {
    name: (value?: string) => (value?.trim() ? true : 'Enter your name'),
    email: (value?: string) => {
      if (!value) return 'Enter your email'
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : 'Enter a valid email'
    },
  },
  initialValues: { name: '', email: '' },
})

// Checked when you leave the field; once it shows an error, on every change until it's fixed.
const fieldConfig = (state: { errors: string[] }) => ({
  validateOnBlur: true,
  validateOnModelUpdate: state.errors.length > 0,
})
const [name, nameAttrs] = defineField('name', fieldConfig)
const [email, emailAttrs] = defineField('email', fieldConfig)

const status = shallowRef('')
const onSubmit = handleSubmit(async (values) => {
  await new Promise((resolve) => setTimeout(resolve, 600))
  status.value = `Account created for ${values.email}`
})
</script>

<style scoped>
.form {
  display: grid;
  gap: 1rem;
  max-inline-size: 22rem;
}
.actions {
  display: flex;
}
</style>
