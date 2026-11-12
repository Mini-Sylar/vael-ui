<template>
  <section class="demo">
    <h3>Submitting</h3>
    <form class="form" novalidate @submit="handleSubmit">
      <Field label="Title" :error="errors.title">
        <Input v-model="title" v-bind="attrs.title" />
      </Field>
      <Field label="Estimate (hours)" :error="errors.hours">
        <Input v-model="hours" v-bind="attrs.hours" inputmode="decimal" />
      </Field>
      <div class="actions">
        <Button type="submit" name="action" value="publish" :loading="submitting">Publish</Button>
        <Button type="submit" name="action" value="draft" variant="outline" :disabled="submitting">
          Save draft
        </Button>
      </div>
      <p v-if="saved" class="done" role="status">{{ saved }}</p>
    </form>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { z } from 'zod'
import { useForm } from 'vael-form'
import { Button, Field, Input } from 'vael-ui'

const saved = shallowRef('')

const { model, errors, attrs, handleSubmit, submitting } = useForm({
  schema: z.object({
    title: z.string().trim().min(3),
    hours: z.string().min(1).transform(Number).pipe(z.number().positive()), // text in, a number out
  }),
  defaultValues: { title: '', hours: '' },
  onSubmit: async (values, { submitter }) => {
    await new Promise((resolve) => setTimeout(resolve, 900)) // your API call
    const action = submitter?.getAttribute('value') === 'draft' ? 'Draft saved' : 'Published'
    saved.value = `${action}: “${values.title}”, ${values.hours} h (a ${typeof values.hours})`
  },
})
const { title, hours } = model
</script>

<style scoped>
.form {
  display: grid;
  gap: 1rem;
  max-inline-size: 22rem;
}
.actions {
  display: flex;
  gap: 0.5rem;
}
.done {
  margin: 0;
  color: var(--ui-text-muted);
}
</style>
