<template>
  <section class="demo">
    <h3>Label placement: <code>top</code> / <code>float</code> / <code>inset</code></h3>
    <p class="note">
      <code>float</code>/<code>inset</code> read focus/filled from the same context, not
      <code>:placeholder-shown</code>, needed once a control isn't a plain text input (Select's
      trigger is a button, InputNumber can be empty-but-focused). Try focusing each, then typing.
    </p>
    <div class="field-grid">
      <Field label="Top (default)" label-placement="top">
        <Input v-model="topValue" placeholder="Type to fill…" />
      </Field>
      <Field label="Float" label-placement="float">
        <Input v-model="floatValue" />
      </Field>
      <Field label="Inset" label-placement="inset">
        <Input v-model="insetValue" placeholder="Always small caption" />
      </Field>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Input } from 'vael-ui'

const topValue = shallowRef('')
const floatValue = shallowRef('')
const insetValue = shallowRef('')
</script>

<style scoped>
.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem;
  max-width: 40rem;
  margin-block-end: 0.75rem;
}
</style>
