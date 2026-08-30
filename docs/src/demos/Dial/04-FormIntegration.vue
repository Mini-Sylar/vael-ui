<template>
  <section class="demo">
    <h3>Form integration</h3>
    <p class="note">
      <code>Field</code> wires up the label/description without extra ARIA plumbing. Separately, any
      Dial with a <code>name</code> renders a hidden input automatically, so it participates in a
      plain <code>&lt;form&gt;</code> submit with no extra wiring.
    </p>
    <Field label="Playback pitch" description="Unbounded, spin freely up or down.">
      <Dial v-model="fieldValue" :value-text="(v) => `${v > 0 ? '+' : ''}${v} st`" />
    </Field>
    <form
      class="row dial-row"
      style="align-items: center; margin-top: 1rem"
      @submit.prevent="onSubmit"
    >
      <Dial v-model="formValue" name="zoom" :min="0" :max="200" />
      <Button type="submit" size="sm">Submit</Button>
      <output class="note">{{ submitted }}</output>
    </form>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Dial, Field } from 'vael-ui'

const fieldValue = shallowRef(0)
const formValue = shallowRef(100)
const submitted = shallowRef('')

function onSubmit(event: Event) {
  const data = new FormData(event.target as HTMLFormElement)
  submitted.value = `zoom=${data.get('zoom')}`
}
</script>

<style scoped>
.dial-row {
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}
</style>
