<template>
  <section class="demo">
    <h3>A bordered record form</h3>
    <p class="note">
      <code>attached</code> is the vael-ui part. The grid, square corners and shared borders are
      about 15 lines of your own CSS (<code>.my-record-form</code>): open the Code tab to copy them.
    </p>
    <div class="my-record-form">
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
/* Your own CSS: vael-ui only provides `attached`. */
.my-record-form {
  --ui-radius: 0px;
  display: grid;
  max-width: 52rem;
  padding: 1px 0 0 1px;
}
.my-record-form > * {
  margin: -1px 0 0 -1px;
}
/* Overlapped neighbors would paint over a focused or invalid field's shared edges. */
.my-record-form > :is(:focus-within, [data-invalid]) {
  position: relative;
  z-index: 1;
}
@media (min-width: 48rem) {
  .my-record-form {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .my-record-form > .wide {
    grid-column: span 2;
  }
}
</style>
