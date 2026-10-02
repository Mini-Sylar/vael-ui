<template>
  <section class="demo">
    <h3>Side labels: <code>start</code> / <code>end</code></h3>
    <p class="note">
      <code>label-placement="start"</code> puts the label beside the control. Add
      <code>attached</code> to join them into one box. <code>label-width</code> lines up a column of
      fields, and <code>label-align="end"</code> right-aligns plain labels next to the control.
      Attached cells look better with the default <code>start</code>. On narrow screens the labels
      move on top, because <code>label-placement</code> is bound to VueUse's
      <code>useMediaQuery</code>.
    </p>
    <SelectButton v-model="look" :items="looks" size="sm" :allow-empty="false" class="look" />
    <div class="side-form">
      <Field
        label="Username"
        :label-placement="placement"
        :attached="attached"
        :label-width="96"
        :label-align="align"
      >
        <Input v-model="username" />
      </Field>
      <Field
        :label-placement="placement"
        :attached="attached"
        :label-width="96"
        :label-align="align"
      >
        <template #label><PhEnvelopeSimple weight="bold" /> Email</template>
        <Input v-model="email" type="email" />
      </Field>
      <Field
        label="Plan"
        :label-placement="placement"
        :attached="attached"
        :label-width="96"
        :label-align="align"
      >
        <Select v-model="plan" :items="plans" />
      </Field>
      <Field
        label="Address"
        :label-placement="placement"
        :attached="attached"
        :label-width="96"
        :label-align="align"
        description="Shown on invoices."
      >
        <Textarea v-model="address" :rows="2" />
      </Field>
      <Field label="kg" label-placement="end" :attached="attached">
        <InputNumber v-model="weight" />
      </Field>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { Field, Input, InputNumber, Select, SelectButton, Textarea } from 'vael-ui'
import { PhEnvelopeSimple } from '@phosphor-icons/vue'

const looks = [
  { label: 'Plain', value: 'plain' },
  { label: 'Attached', value: 'attached' },
]
const look = shallowRef('plain')
const attached = computed(() => look.value === 'attached')
// End-aligned text suits plain labels (it sits against the input); an attached cell reads better start-aligned.
const align = computed(() => (attached.value ? 'start' : 'end'))

// ssrWidth: the docs are prerendered, so the server assumes a wide screen instead of mismatching.
const wide = useMediaQuery('(min-width: 40rem)', { ssrWidth: 1024 })
const placement = computed(() => (wide.value ? 'start' : 'top'))

const username = shallowRef('jane.doe')
const email = shallowRef('jane@example.com')
const plan = shallowRef('pro')
const plans = [
  { label: 'Free', value: 'free' },
  { label: 'Pro', value: 'pro' },
  { label: 'Team', value: 'team' },
]
const address = shallowRef('42 Example Street, Springfield')
const weight = shallowRef<number | null>(72)
</script>

<style scoped>
.look {
  margin-block-end: 1rem;
}
.side-form {
  display: grid;
  gap: 0.75rem;
  max-width: 28rem;
}
</style>
