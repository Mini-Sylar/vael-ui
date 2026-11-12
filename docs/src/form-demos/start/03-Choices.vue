<template>
  <section class="demo">
    <h3>Choices</h3>
    <form class="form" novalidate @submit="handleSubmit">
      <Field label="Plan" :error="errors.plan">
        <RadioGroup v-model="plan" v-bind="attrs.plan" orientation="horizontal">
          <Radio value="free" label="Free" />
          <Radio value="pro" label="Pro" />
          <Radio value="team" label="Team" />
        </RadioGroup>
      </Field>
      <Field label="Seats" :error="errors.seats">
        <InputNumber v-model="seats" v-bind="attrs.seats" />
      </Field>
      <Field label="Topics" description="Pick one or two." :error="errors.topics">
        <fieldset class="topics" v-bind="attrs.topics">
          <Checkbox
            v-for="topic in topicList"
            :key="topic"
            v-model="topics"
            :value="topic"
            :label="topic"
          />
        </fieldset>
      </Field>
      <Field :error="errors.terms">
        <Checkbox v-model="terms" v-bind="attrs.terms" label="I accept the terms" />
      </Field>
      <Button type="submit">Continue</Button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { useForm } from 'vael-form'
import { Button, Checkbox, Field, InputNumber, Radio, RadioGroup } from 'vael-ui'

const topicList = ['Design', 'Engineering', 'Product']

const { model, errors, attrs, handleSubmit } = useForm({
  schema: z.object({
    plan: z.enum(['free', 'pro', 'team']),
    seats: z.number().int().min(1).max(50),
    topics: z.array(z.string()).min(1).max(2),
    terms: z.boolean().refine((accepted) => accepted, 'Accept the terms to continue'),
  }),
  defaultValues: { seats: 1, topics: [], terms: false },
  onSubmit: () => {},
})
const { plan, seats, topics, terms } = model
</script>

<style scoped>
.form {
  display: grid;
  gap: 1rem;
  max-inline-size: 22rem;
}
.topics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin: 0;
  padding: 0;
  border: 0;
}
</style>
