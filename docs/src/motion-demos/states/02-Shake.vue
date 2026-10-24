<template>
  <section class="demo">
    <h3>Shake on error</h3>
    <form class="form" novalidate @submit.prevent="submit">
      <Input
        v-model="email"
        type="email"
        aria-label="Email"
        placeholder="name@example.com"
        :invalid="invalid"
        :motion="shake"
        @input="invalid = false"
      />
      <Button type="submit">Subscribe</Button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Input } from 'vael-ui'
import type { InputMotion } from 'vael-ui'

const email = shallowRef('')
const invalid = shallowRef(false)

// An array plays once each time the state is entered.
const shake: InputMotion = {
  states: { invalid: { root: { x: [0, -8, 8, -4, 4, 0] } } },
}

function submit() {
  invalid.value = false
  // Back to valid for a tick, so a second failure enters the state again.
  if (!/^\S+@\S+\.\S+$/.test(email.value)) requestAnimationFrame(() => (invalid.value = true))
}
</script>

<style scoped>
.form {
  display: flex;
  gap: 0.75rem;
  max-width: 24rem;
}
</style>
