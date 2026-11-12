<template>
  <section class="demo">
    <h3>When errors show</h3>
    <form class="form" novalidate @submit="handleSubmit">
      <div class="grid">
        <Field v-for="mode in modes" :key="mode" :label="mode" :error="errors[mode]">
          <Input v-model="model[mode].value" v-bind="attrs[mode]" placeholder="you@example.com" />
        </Field>
      </div>
      <div class="actions">
        <Button type="submit">Submit</Button>
        <Button variant="ghost" @click="reset()">Reset</Button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { useForm } from 'vael-form'
import { Button, Field, Input } from 'vael-ui'

const modes = ['edited', 'blur', 'input', 'submit'] as const

// One email field per mode: each shows the same error at a different moment.
const { model, errors, attrs, handleSubmit, reset } = useForm({
  schema: z.object({ edited: z.email(), blur: z.email(), input: z.email(), submit: z.email() }),
  defaultValues: { edited: '', blur: '', input: '', submit: '' },
  showErrors: { edited: 'edited', blur: 'blur', input: 'input', submit: 'submit' },
  onSubmit: () => {},
})
</script>

<style scoped>
.form {
  display: grid;
  gap: 1rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: 1rem;
}
.actions {
  display: flex;
  gap: 0.5rem;
}
</style>
