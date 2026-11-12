<template>
  <section class="demo">
    <h3>Rows you add and remove</h3>
    <form class="form" novalidate @submit="handleSubmit">
      <ul class="rows">
        <li v-for="item in members.items" :key="item.key" class="row">
          <Field label="Name" :error="item.field.name.error">
            <Input v-model="item.field.name.value" v-bind="item.field.name.attrs" />
          </Field>
          <Field label="Email" :error="item.field.email.error">
            <Input v-model="item.field.email.value" v-bind="item.field.email.attrs" type="email" />
          </Field>
          <Button
            class="remove"
            variant="ghost"
            :aria-label="`Remove member ${item.index + 1}`"
            @click="members.remove(item.index)"
          >
            <PhX :size="16" aria-hidden="true" />
          </Button>
        </li>
      </ul>
      <p v-if="errors.members" class="list-error" role="alert">{{ errors.members }}</p>
      <div class="actions">
        <Button variant="outline" @click="members.push({ name: '', email: '' })">
          Add member
        </Button>
        <Button type="submit">Send invites</Button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { useForm } from 'vael-form'
import { Button, Field, Input } from 'vael-ui'
import { PhX } from '@phosphor-icons/vue'

const { errors, field, handleSubmit } = useForm({
  schema: z.object({
    members: z
      .array(z.object({ name: z.string().min(2), email: z.email() }))
      .min(1, 'Add at least one member'),
  }),
  defaultValues: { members: [{ name: '', email: '' }] },
  onSubmit: () => {},
})
// A list's rows and operations live on its field.
const members = field('members')
</script>

<style scoped>
.form {
  display: grid;
  gap: 1rem;
  max-inline-size: 36rem;
}
.rows {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.75rem;
  align-items: start;
}
.remove {
  margin-block-start: 1.6rem;
}
.list-error {
  margin: 0;
  color: var(--ui-danger);
  font-size: 0.875rem;
}
.actions {
  display: flex;
  gap: 0.5rem;
}
@media (max-width: 34rem) {
  .row {
    grid-template-columns: 1fr auto;
  }
  .row > :nth-child(2) {
    grid-column: 1;
  }
  .remove {
    grid-row: 1;
    grid-column: 2;
  }
}
</style>
