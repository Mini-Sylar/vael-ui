<template>
  <section class="demo">
    <h3><code>#prepend</code> / <code>#append</code> cells</h3>
    <p class="note">
      Field's cells work with every control: an Input, a Select, a Combobox, a growing Textarea.
      Text and icons share one segment, and each control gets its own, as in the price row (<code
        >$</code
      >
      plus a currency Select) and the search row (a scope Select and a Button). Next to a control
      without a frame (a Switch, a Slider), cells render as plain text and an
      <code>attached</code> label becomes a plain side label.
    </p>
    <div class="side-form">
      <Field label="Website">
        <template #prepend>https://</template>
        <Input v-model="site" />
        <template #append>.com</template>
      </Field>
      <Field label="Price">
        <template #prepend>
          $
          <Select v-model="currency" :items="currencies" aria-label="Currency" />
        </template>
        <InputNumber v-model="price" />
      </Field>
      <Field label="Search">
        <Input v-model="query" placeholder="Search docs…" />
        <template #append>
          <Select v-model="scope" :items="scopes" aria-label="Scope" />
          <Button @click="searched = query">Go</Button>
        </template>
      </Field>
      <Field label="Budget" label-placement="start" attached :label-width="96">
        <InputNumber v-model="budget" />
        <template #append>USD</template>
      </Field>
      <Field label="Assignee" label-placement="start" attached :label-width="96">
        <template #prepend><PhUser weight="bold" /></template>
        <Combobox v-model="assignee" :items="people" placeholder="Search people…" />
      </Field>
      <Field label="Status">
        <Select v-model="status" :items="statuses" />
        <template #append>
          <Button variant="outline" @click="status = 'open'">Reset</Button>
        </template>
      </Field>
      <Field label="Notes">
        <template #prepend><PhNotePencil weight="bold" /></template>
        <Textarea v-model="notes" :rows="3" auto-grow />
      </Field>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Combobox, Field, Input, InputNumber, Select, Textarea } from 'vael-ui'
import { PhNotePencil, PhUser } from '@phosphor-icons/vue'

const site = shallowRef('vael-ui')
const price = shallowRef<number | null>(49)
const currency = shallowRef('usd')
const currencies = [
  { label: 'USD', value: 'usd' },
  { label: 'EUR', value: 'eur' },
  { label: 'GHS', value: 'ghs' },
]
const query = shallowRef('')
const searched = shallowRef('')
const scope = shallowRef('all')
const scopes = [
  { label: 'All', value: 'all' },
  { label: 'Components', value: 'components' },
  { label: 'Guides', value: 'guides' },
]
const budget = shallowRef<number | null>(1200)
const assignee = shallowRef<string | number | (string | number)[] | null>(null)
const people = [
  { label: 'Ama Mensah', value: 'ama' },
  { label: 'Kofi Boateng', value: 'kofi' },
  { label: 'Esi Owusu', value: 'esi' },
]
const status = shallowRef('in-progress')
const statuses = [
  { label: 'Open', value: 'open' },
  { label: 'In progress', value: 'in-progress' },
  { label: 'Done', value: 'done' },
]
const notes = shallowRef('Grows with its content; the cells stretch with it.')
</script>

<style scoped>
.side-form {
  display: grid;
  gap: 0.75rem;
  max-width: 28rem;
}
</style>
