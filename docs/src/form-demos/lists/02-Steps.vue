<template>
  <section class="demo">
    <h3>Steps</h3>
    <Stepper v-model="step" :items="stepItems" class="stepper" />
    <form class="form" novalidate @submit.prevent="last ? handleSubmit($event) : next()">
      <template v-if="step === 0">
        <Field label="Email" :error="errors.account.email">
          <Input v-model="account.email" v-bind="attrs.account.email" type="email" />
        </Field>
        <Field label="Password" :error="errors.account.password">
          <Input v-model="account.password" v-bind="attrs.account.password" type="password" />
        </Field>
      </template>
      <template v-else>
        <Field label="Display name" :error="errors.profile.name">
          <Input v-model="profile.name" v-bind="attrs.profile.name" />
        </Field>
        <Field label="Role" :error="errors.profile.role">
          <Select v-model="profile.role" v-bind="attrs.profile.role" :items="roles" />
        </Field>
      </template>
      <div class="actions">
        <Button v-if="step > 0" variant="outline" @click="step--">Back</Button>
        <Button type="submit" :loading="submitting">{{ last ? 'Create account' : 'Next' }}</Button>
      </div>
      <p v-if="done" class="done" role="status">Account created.</p>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { z } from 'zod'
import { useForm } from 'vael-form'
import { Button, Field, Input, Select, Stepper } from 'vael-ui'

const roles = [
  { label: 'Designer', value: 'designer' },
  { label: 'Engineer', value: 'engineer' },
]
const steps = ['account', 'profile'] as const
const stepItems = [{ label: 'Account' }, { label: 'Profile' }]
const step = shallowRef(0)
const last = computed(() => step.value === steps.length - 1)
const done = shallowRef(false)

const { model, errors, attrs, validate, handleSubmit, submitting } = useForm({
  schema: z.object({
    account: z.object({ email: z.email(), password: z.string().min(8) }),
    profile: z.object({ name: z.string().min(2), role: z.enum(['designer', 'engineer']) }),
  }),
  onSubmit: async () => {
    await new Promise((resolve) => setTimeout(resolve, 700))
    done.value = true
  },
})
const { account, profile } = model

// One group at a time: only this step's errors show.
async function next() {
  if (await validate(steps[step.value]!)) step.value++
}
</script>

<style scoped>
.stepper {
  max-inline-size: 22rem;
  margin-block-end: 1.25rem;
}
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
