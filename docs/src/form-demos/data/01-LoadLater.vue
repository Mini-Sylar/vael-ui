<template>
  <section class="demo">
    <h3>Defaults that load later</h3>
    <form class="form" novalidate @submit="handleSubmit">
      <Field label="Display name" :error="errors.name">
        <Skeleton :loading="!profile">
          <Input v-model="name" v-bind="attrs.name" />
        </Skeleton>
      </Field>
      <Field label="Bio" :error="errors.bio">
        <Skeleton :loading="!profile">
          <Textarea v-model="bio" v-bind="attrs.bio" :rows="3" />
        </Skeleton>
      </Field>
      <div class="actions">
        <Button type="submit" :disabled="!dirty" :loading="submitting">Save</Button>
        <Button variant="ghost" @click="load()">Load again</Button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { z } from 'zod'
import { useForm } from 'vael-form'
import { Button, Field, Input, Skeleton, Textarea } from 'vael-ui'

interface Profile {
  name: string
  bio: string
}

// Stands in for a query's `data`: undefined until the request returns.
const profile = shallowRef<Profile>()
function load() {
  profile.value = undefined
  setTimeout(
    () => (profile.value = { name: 'Ada Lovelace', bio: 'Writes the first programs.' }),
    1200,
  )
}
load()

const { model, errors, attrs, handleSubmit, dirty, submitting } = useForm({
  schema: z.object({ name: z.string().min(2), bio: z.string().max(80) }),
  defaultValues: profile, // a ref: the form takes the data when it arrives
  onSubmit: async (values, { form }) => {
    await new Promise((resolve) => setTimeout(resolve, 600))
    form.reset(values) // the saved values are the new defaults
  },
})
const { name, bio } = model
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
</style>
