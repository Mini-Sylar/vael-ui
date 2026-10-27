<template>
  <section class="demo">
    <h3>Form integration</h3>
    <p class="note">
      <code>Field</code> adds the label and description without extra ARIA work. Any Dial with a
      <code>name</code> also renders a hidden input, so it submits with a plain
      <code>&lt;form&gt;</code>.
    </p>
    <Field label="Playback pitch" description="Unbounded, spin freely up or down.">
      <Dial v-model="fieldValue" :value-text="(v) => `${v > 0 ? '+' : ''}${v} st`" />
    </Field>
    <form
      class="row dial-row"
      style="align-items: flex-end; margin-top: 1rem"
      @submit.prevent="onSubmit"
    >
      <Field label="Zoom">
        <Dial v-model="formValue" name="zoom" :min="0" :max="200" />
      </Field>
      <Button type="submit" size="sm">Submit</Button>
      <output class="demo-status">{{ submitted }}</output>
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
