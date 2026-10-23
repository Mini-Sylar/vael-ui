<template>
  <section class="demo">
    <h3>Label placement: <code>top</code> / <code>float</code> / <code>inset</code></h3>
    <p class="note">
      <code>float</code> and <code>inset</code> read the focused and filled state from Field, not
      from <code>:placeholder-shown</code>, because some controls aren’t plain text inputs: Select’s
      trigger is a button, and InputNumber can be empty while focused. Focus each one, then type.
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
