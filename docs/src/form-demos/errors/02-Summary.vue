<template>
  <section class="demo">
    <h3>Error summary</h3>
    <form class="form" novalidate @submit="handleSubmit">
      <Message v-if="errorList.length" variant="error" title="Fix these to continue">
        <ul class="summary">
          <li v-for="error in errorList" :key="error.path">
            <a :href="`#${attrs[error.path as Name].id}`">{{ error.message }}</a>
          </li>
        </ul>
      </Message>
      <Field label="Full name" :error="errors.name">
        <Input v-model="name" v-bind="attrs.name" />
      </Field>
      <Field label="Email" :error="errors.email">
        <Input v-model="email" v-bind="attrs.email" type="email" />
      </Field>
      <Field label="Company" :error="errors.company">
        <Input v-model="company" v-bind="attrs.company" />
      </Field>
      <Button type="submit">Request access</Button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { useForm } from 'vael-form'
import { Button, Field, Input, Message } from 'vael-ui'

const schema = z.object({ name: z.string().min(2), email: z.email(), company: z.string().min(2) })
type Name = keyof z.input<typeof schema>

const { model, errors, attrs, errorList, handleSubmit } = useForm({
  schema,
  defaultValues: { name: '', email: '', company: '' },
  onSubmit: () => {},
})
const { name, email, company } = model
</script>

<style scoped>
.form {
  display: grid;
  gap: 1rem;
  max-inline-size: 24rem;
}
.summary {
  margin: 0;
  padding-inline-start: 1.125rem;
}
.summary a {
  color: inherit;
}
</style>
