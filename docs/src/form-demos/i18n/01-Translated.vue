<template>
  <section class="demo">
    <h3>Translated errors</h3>
    <form class="form" novalidate @submit="handleSubmit">
      <Field :label="t('formsDemo.name')" :error="errors.name">
        <Input v-model="name" v-bind="attrs.name" />
      </Field>
      <Field :label="t('formsDemo.email')" :error="errors.email">
        <Input v-model="email" v-bind="attrs.email" type="email" />
      </Field>
      <Field :label="t('formsDemo.age')" :error="errors.age">
        <InputNumber v-model="age" v-bind="attrs.age" />
      </Field>
      <Button type="submit">{{ t('formsDemo.submit') }}</Button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { z } from 'zod'
import { useForm } from 'vael-form'
import { Button, Field, Input, InputNumber } from 'vael-ui'

const { t } = useI18n()

// The app installed formPlugin with its i18n: these errors come from its formKit messages.
const { model, errors, attrs, handleSubmit } = useForm({
  schema: z.object({ name: z.string().min(2), email: z.email(), age: z.number().min(18) }),
  defaultValues: { name: '', email: '' },
  labels: { name: 'formsDemo.name', email: 'formsDemo.email', age: 'formsDemo.age' },
  onSubmit: () => {},
})
const { name, email, age } = model
</script>

<style scoped>
.form {
  display: grid;
  gap: 1rem;
  max-inline-size: 22rem;
}
</style>
