<template>
  <section class="demo">
    <h3>Server errors</h3>
    <form class="form" novalidate @submit="handleSubmit">
      <Field label="Work email" :error="errors.email">
        <Input v-model="email" v-bind="attrs.email" type="email" placeholder="taken@example.com" />
      </Field>
      <Button type="submit" :loading="submitting">Invite</Button>
      <p v-if="invited" class="done" role="status">Invite sent to {{ invited }}.</p>
    </form>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { z } from 'zod'
import { useForm } from 'vael-form'
import { Button, Field, Input } from 'vael-ui'

const invited = shallowRef('')

// Stands in for your API: it rejects one address.
async function invite(address: string) {
  await new Promise((resolve) => setTimeout(resolve, 700))
  if (address === 'taken@example.com') throw new Error('That person is already on the team')
}

const { model, errors, attrs, handleSubmit, submitting } = useForm({
  schema: z.object({ email: z.email() }),
  defaultValues: { email: '' },
  onSubmit: async (values, { form }) => {
    invited.value = ''
    try {
      await invite(values.email)
      invited.value = values.email
    } catch (error) {
      form.setErrors({ email: (error as Error).message })
    }
  },
})
const { email } = model
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
