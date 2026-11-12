<template>
  <section class="demo">
    <h3>Form state</h3>
    <div class="layout">
      <form class="form" novalidate @submit="handleSubmit">
        <Field label="Project name" :error="errors.name">
          <Input v-model="name" v-bind="attrs.name" />
        </Field>
        <Field label="Visibility" :error="errors.visibility">
          <Select v-model="visibility" v-bind="attrs.visibility" :items="visibilities" />
        </Field>
        <div class="actions">
          <Button type="submit">Save</Button>
          <Button variant="ghost" :disabled="!dirty" @click="reset()">Reset</Button>
        </div>
      </form>
      <dl class="state">
        <div>
          <dt>valid</dt>
          <dd>{{ valid }}</dd>
        </div>
        <div>
          <dt>dirty</dt>
          <dd>{{ dirty }}</dd>
        </div>
        <div>
          <dt>touched</dt>
          <dd>{{ touched }}</dd>
        </div>
        <div>
          <dt>submitCount</dt>
          <dd>{{ submitCount }}</dd>
        </div>
        <div class="values">
          <dt>values</dt>
          <dd>
            <code>{{ values }}</code>
          </dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { useForm } from 'vael-form'
import { Button, Field, Input, Select } from 'vael-ui'

const visibilities = [
  { label: 'Private', value: 'private' },
  { label: 'Team', value: 'team' },
  { label: 'Public', value: 'public' },
]

const { model, errors, attrs, handleSubmit, reset, valid, dirty, touched, submitCount, values } =
  useForm({
    schema: z.object({
      name: z.string().min(3),
      visibility: z.enum(['private', 'team', 'public']),
    }),
    defaultValues: { name: 'Roadmap', visibility: 'team' },
    onSubmit: (saved, { form }) => form.reset(saved), // the saved values become the new defaults
  })
const { name, visibility } = model
</script>

<style scoped>
.layout {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: flex-start;
}
.form {
  display: grid;
  gap: 1rem;
  flex: 1 1 16rem;
  max-inline-size: 22rem;
}
.actions {
  display: flex;
  gap: 0.5rem;
}
.state {
  display: grid;
  gap: 0.375rem;
  flex: 1 1 12rem;
  margin: 0;
  padding: 0.75rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  font-size: 0.8125rem;
}
.state div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
.state dt {
  color: var(--ui-text-muted);
  font-family: var(--ui-font-mono, ui-monospace, monospace);
}
.state dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.state .values {
  flex-direction: column;
  gap: 0.25rem;
}
.state code {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
