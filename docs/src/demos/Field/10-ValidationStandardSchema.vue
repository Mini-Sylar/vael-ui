<template>
  <section class="demo">
    <h3>Validation with a Standard Schema</h3>
    <p class="note">
      Zod, Valibot, ArkType and other Standard Schema validators all expose
      <code>~standard.validate</code>. Each issue’s <code>path</code> names its field, so its
      message goes to that Field’s <code>error</code>. This demo uses a small handwritten schema,
      and a Zod or Valibot schema works in its place.
    </p>
    <form class="form" novalidate @submit.prevent="submit">
      <Field label="Team name" :error="errors.team" required>
        <Input v-model="values.team" :invalid="!!errors.team" @blur="touch('team')" />
      </Field>
      <Field label="Seats" description="Between 1 and 50." :error="errors.seats" required>
        <InputNumber
          v-model="values.seats"
          :min="1"
          :max="50"
          allow-empty
          :invalid="!!errors.seats"
          @blur="touch('seats')"
        />
      </Field>
      <div class="actions">
        <Button type="submit">Create team</Button>
      </div>
      <p class="demo-status" aria-live="polite">{{ status }}</p>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, shallowRef, watch } from 'vue'
import { Button, Field, Input, InputNumber } from 'vael-ui'

interface Team {
  team: string
  seats: number | null
}

// The Standard Schema shape: `~standard.validate` returns the value, or issues, maybe in a promise.
interface Issue {
  message: string
  path?: readonly PropertyKey[]
}
type Result<T> = { value: T; issues?: undefined } | { issues: readonly Issue[] }
interface StandardSchema<T> {
  '~standard': {
    version: 1
    vendor: string
    validate: (value: unknown) => Result<T> | Promise<Result<T>>
  }
}

const teamSchema: StandardSchema<Team> = {
  '~standard': {
    version: 1,
    vendor: 'demo',
    validate(input) {
      const value = input as Team
      const issues: Issue[] = []
      if (value.team.trim().length < 2)
        issues.push({ path: ['team'], message: 'Use at least 2 characters' })
      if (value.seats == null) issues.push({ path: ['seats'], message: 'Enter a number of seats' })
      else if (value.seats < 1 || value.seats > 50)
        issues.push({ path: ['seats'], message: 'Pick between 1 and 50 seats' })
      return issues.length ? { issues } : { value }
    },
  },
}

const values = reactive<Team>({ team: '', seats: null })
const issues = shallowRef<readonly Issue[]>([])
// Errors show for the fields you've left, and for all of them after a submit.
const touched = reactive(new Set<keyof Team>())
const submitted = shallowRef(false)
const status = shallowRef('')

async function check() {
  const result = await teamSchema['~standard'].validate({ ...values })
  issues.value = result.issues ?? []
  return result
}
watch(values, check, { immediate: true })

const errors = computed(() => {
  const byField: Partial<Record<keyof Team, string>> = {}
  for (const issue of issues.value) {
    const field = issue.path?.[0] as keyof Team
    if ((submitted.value || touched.has(field)) && !byField[field]) byField[field] = issue.message
  }
  return byField
})

function touch(field: keyof Team) {
  touched.add(field)
}

async function submit() {
  submitted.value = true
  const result = await check()
  if (!result.issues) status.value = `Created ${result.value.team}`
}
</script>

<style scoped>
.form {
  display: grid;
  gap: 1rem;
  max-inline-size: 22rem;
}
.actions {
  display: flex;
}
</style>
