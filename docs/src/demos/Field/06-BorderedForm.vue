<template>
  <section class="demo">
    <h3>A bordered record form</h3>
    <p class="note">
      A layout, not a component: attached fields in a CSS grid with <code>--ui-radius: 0</code>, no
      gaps, and borders overlapped by 1px so neighbors share one line.
    </p>
    <div class="record-form">
      <Field label="Username" label-placement="start" attached :label-width="104">
        <Input v-model="username" />
      </Field>
      <Field label="Telephone" label-placement="start" attached :label-width="104">
        <Input v-model="phone" type="tel" />
      </Field>
      <Field label="Place" label-placement="start" attached :label-width="104">
        <Input v-model="place" />
      </Field>
      <Field label="Remarks" label-placement="start" attached :label-width="104">
        <Select v-model="remark" :items="remarks" />
      </Field>
      <Field label="Address" label-placement="start" attached :label-width="104" class="wide">
        <Input v-model="address" />
      </Field>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Input, Select } from 'vael-ui'

const username = shallowRef('jane.doe')
const phone = shallowRef('555-0100')
const place = shallowRef('Springfield')
const remark = shallowRef('school')
const remarks = [
  { label: 'School', value: 'school' },
  { label: 'Work', value: 'work' },
  { label: 'Home', value: 'home' },
]
const address = shallowRef('42 Example Street, Apartment 7, Springfield, 01234')
</script>

<style scoped>
.record-form {
  --ui-radius: 0px;
  display: grid;
  max-width: 52rem;
  padding: 1px 0 0 1px;
}
.record-form > * {
  margin: -1px 0 0 -1px;
}
/* Overlapped neighbours would paint over a focused or invalid field's shared edges. */
.record-form > :is(:focus-within, [data-invalid]) {
  position: relative;
  z-index: 1;
}
@media (min-width: 48rem) {
  .record-form {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .record-form > .wide {
    grid-column: span 2;
  }
}
</style>
