<template>
  <section class="demo">
    <h3>Unions</h3>
    <form class="form" novalidate @submit="handleSubmit">
      <SelectButton v-model="method" :items="methods" :allow-empty="false" aria-label="Pay by" />
      <Field v-if="method === 'card'" label="Card number" :error="errors.number">
        <Input v-model="number" v-bind="attrs.number" inputmode="numeric" />
      </Field>
      <Field v-else label="IBAN" :error="errors.iban">
        <Input v-model="iban" v-bind="attrs.iban" />
      </Field>
      <Button type="submit">Pay</Button>
      <p v-if="sent" class="done" role="status">
        Submitted: <code>{{ sent }}</code>
      </p>
    </form>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { z } from 'zod'
import { useForm } from 'vael-form'
import { Button, Field, Input, SelectButton } from 'vael-ui'

const methods = [
  { label: 'Card', value: 'card' },
  { label: 'Bank transfer', value: 'bank' },
]
const sent = shallowRef('')

const { model, errors, attrs, handleSubmit } = useForm({
  schema: z.discriminatedUnion('method', [
    z.object({
      method: z.literal('card'),
      number: z.string().regex(/^\d{16}$/, 'Enter 16 digits'),
    }),
    z.object({ method: z.literal('bank'), iban: z.string().min(15) }),
  ]),
  defaultValues: { method: 'card', number: '' },
  onSubmit: (values) => (sent.value = JSON.stringify(values)), // the active branch only
})
const { method, number, iban } = model
</script>

<style scoped>
.form {
  display: grid;
  gap: 1rem;
  max-inline-size: 22rem;
  justify-items: start;
}
.form > :deep(.ui-field) {
  justify-self: stretch;
}
.done {
  margin: 0;
  color: var(--ui-text-muted);
}
</style>
