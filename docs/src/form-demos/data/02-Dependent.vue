<template>
  <section class="demo">
    <h3>Fields that follow others</h3>
    <form class="form" novalidate @submit="handleSubmit">
      <Field label="Country" :error="errors.country">
        <Select v-model="country" v-bind="attrs.country" :items="countries" placeholder="Choose…" />
      </Field>
      <Field label="City" :error="errors.city">
        <Select
          v-model="city"
          v-bind="attrs.city"
          :items="cities"
          :disabled="!country"
          placeholder="Choose…"
        />
      </Field>
      <Button type="submit">Save</Button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { z } from 'zod'
import { useForm } from 'vael-form'
import { Button, Field, Select } from 'vael-ui'

const citiesOf: Record<string, string[]> = {
  gh: ['Accra', 'Kumasi', 'Tamale'],
  jp: ['Tokyo', 'Osaka', 'Kyoto'],
  pt: ['Lisbon', 'Porto', 'Braga'],
}
const countries = [
  { label: 'Ghana', value: 'gh' },
  { label: 'Japan', value: 'jp' },
  { label: 'Portugal', value: 'pt' },
]

const { model, errors, attrs, handleSubmit } = useForm({
  schema: z.object({ country: z.string().min(1), city: z.string().min(1) }),
  defaultValues: { country: '', city: '' },
  onSubmit: () => {},
})
const { country, city } = model

// Options that depend on a value: a computed.
const cities = computed(() =>
  (citiesOf[country.value ?? ''] ?? []).map((c) => ({ label: c, value: c })),
)
// A value that follows another: cleared when you pick a new country, not when data loads.
country.watch(() => (city.value = ''))
</script>

<style scoped>
.form {
  display: grid;
  gap: 1rem;
  max-inline-size: 22rem;
}
</style>
