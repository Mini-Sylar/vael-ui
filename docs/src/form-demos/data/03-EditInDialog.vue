<template>
  <section class="demo">
    <h3>In a dialog</h3>
    <ul class="people">
      <li v-for="person in people" :key="person.id">
        <span>
          <strong>{{ person.name }}</strong>
          <span class="role">{{ person.role }}</span>
        </span>
        <Button variant="outline" size="sm" @click="edit(person)">Edit</Button>
      </li>
    </ul>
    <Dialog v-model:open="open" title="Edit member">
      <form id="edit-member" class="form" novalidate @submit="handleSubmit">
        <Field label="Name" :error="errors.name">
          <Input v-model="name" v-bind="attrs.name" />
        </Field>
        <Field label="Role" :error="errors.role">
          <Input v-model="role" v-bind="attrs.role" />
        </Field>
      </form>
      <template #footer="{ close }">
        <Button variant="ghost" @click="close()">Cancel</Button>
        <Button type="submit" form="edit-member" :loading="submitting">Save</Button>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { z } from 'zod'
import { useForm } from 'vael-form'
import { Button, Dialog, Field, Input } from 'vael-ui'

interface Person {
  id: number
  name: string
  role: string
}
const people = ref<Person[]>([
  { id: 1, name: 'Ama Owusu', role: 'Designer' },
  { id: 2, name: 'Kenji Sato', role: 'Engineer' },
])
const open = shallowRef(false)
let editing: Person | undefined

const { model, errors, attrs, handleSubmit, submitting, reset } = useForm({
  schema: z.object({ name: z.string().min(2), role: z.string().min(2) }),
  onSubmit: async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    Object.assign(editing!, values)
    open.value = false
  },
})
const { name, role } = model

// The form stays mounted: reset it to the person you open, so nothing from the last edit stays.
function edit(person: Person) {
  editing = person
  reset({ name: person.name, role: person.role })
  open.value = true
}
</script>

<style scoped>
.people {
  display: grid;
  gap: 0.5rem;
  max-inline-size: 24rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.people li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.role {
  margin-inline-start: 0.5rem;
  color: var(--ui-text-muted);
}
.form {
  display: grid;
  gap: 1rem;
}
</style>
