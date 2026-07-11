<template>
  <section class="demo">
    <h2>Form — the vee-validate seam</h2>
    <p class="note">
      vael-ui ships no <code>Form</code> component — submission orchestration and validation rules
      are vee-validate's job (or the native <code>&lt;form&gt;</code>'s). <code>Field</code>'s
      <code>error</code> prop is just a string; here it's <code>errors.&lt;name&gt;</code> from
      vee-validate's <code>useForm</code>. That's the entire seam: two props (<code>error</code>,
      <code>v-model</code>) and nothing library-specific in between.
    </p>

    <form class="form-grid" novalidate @submit="onSubmit">
      <Field label="Name" label-placement="float" required :error="errors.name">
        <Input v-model="name" v-bind="nameAttrs" placeholder="Ada Lovelace" />
      </Field>
      <Field label="Email" label-placement="float" required :error="errors.email">
        <Input v-model="email" v-bind="emailAttrs" type="email" placeholder="ada@example.com" />
      </Field>
      <Field
        label="Password"
        label-placement="float"
        description="At least 6 characters."
        required
        :error="errors.password"
      >
        <Input v-model="password" v-bind="passwordAttrs" type="password" />
      </Field>
      <div class="row">
        <Button type="submit" :loading="isSubmitting">Create account</Button>
        <Button type="button" variant="outline" @click="resetForm()">Reset</Button>
      </div>
    </form>

    <p v-if="submittedValues" class="note">
      Submitted: <code>{{ submittedValues }}</code>
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { useForm } from 'vee-validate'
import { Button, Field, Input } from 'vael-ui'

function required(value: unknown, message: string): true | string {
  return value ? true : message
}

const { errors, defineField, handleSubmit, isSubmitting, resetForm } = useForm({
  validationSchema: {
    name: (value: unknown) => required(value, 'Name is required'),
    email: (value: unknown) => {
      const requiredCheck = required(value, 'Email is required')
      if (requiredCheck !== true) return requiredCheck
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)) || 'Enter a valid email'
    },
    password: (value: unknown) => {
      const requiredCheck = required(value, 'Password is required')
      if (requiredCheck !== true) return requiredCheck
      return String(value).length >= 6 || 'At least 6 characters'
    },
  },
})

const [name, nameAttrs] = defineField('name')
const [email, emailAttrs] = defineField('email')
const [password, passwordAttrs] = defineField('password')

const submittedValues = shallowRef<string | null>(null)
const onSubmit = handleSubmit((values) => {
  submittedValues.value = JSON.stringify(values)
})
</script>

<style scoped>
.form-grid {
  display: grid;
  gap: 1rem;
  max-width: 22rem;
}
</style>
