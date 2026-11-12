<template>
  <section class="demo">
    <h3>Limits from the schema</h3>
    <form class="form" novalidate @submit="handleSubmit">
      <Field
        label="Headline"
        :description="`${headline?.length ?? 0} of 40`"
        :error="errors.headline"
      >
        <Input v-model="headline" v-bind="attrs.headline" />
      </Field>
      <Field label="Guests" :error="errors.guests">
        <InputNumber v-model="guests" v-bind="attrs.guests" />
      </Field>
      <p class="attrs">
        From the schema: <code>maxlength</code> {{ attrs.headline.maxlength }}, <code>min</code>
        {{ attrs.guests.min }}, <code>max</code> {{ attrs.guests.max }}
      </p>
      <Button type="submit">Save</Button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { useForm } from 'vael-form'
import { Button, Field, Input, InputNumber } from 'vael-ui'

const { model, errors, attrs, handleSubmit } = useForm({
  schema: z.object({
    headline: z.string().min(5).max(40),
    guests: z.number().int().min(1).max(12),
  }),
  defaultValues: { headline: '', guests: 2 },
  onSubmit: () => {},
})
const { headline, guests } = model
</script>

<style scoped>
.form {
  display: grid;
  gap: 1rem;
  max-inline-size: 22rem;
}
.attrs {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
