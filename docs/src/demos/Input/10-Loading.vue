<template>
  <section class="demo">
    <h3>While it checks</h3>
    <p class="note">
      <code>loading</code> shows a spinner at the end of the field and marks it busy for screen
      readers. Type a name: <code>ama</code> is taken.
    </p>
    <Field label="Username" :error="taken ? 'That name is taken' : undefined">
      <Input v-model="name" :loading="checking" :invalid="taken" />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { Field, Input } from 'vael-ui'

const name = shallowRef('')
const checking = shallowRef(false)
const taken = shallowRef(false)

// Stands in for your API.
let timer: ReturnType<typeof setTimeout> | undefined
watch(name, (value) => {
  clearTimeout(timer)
  taken.value = false
  checking.value = value.length > 0
  timer = setTimeout(() => {
    checking.value = false
    taken.value = value.toLowerCase() === 'ama'
  }, 700)
})
</script>
