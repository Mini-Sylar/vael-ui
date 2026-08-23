<template>
  <section class="demo">
    <h3>Inline appearance for form validation</h3>
    <p class="note">
      <code>appearance="bare"</code> drops the border/background/padding, icon plus colored text
      only, sized for sitting directly under a field instead of standing alone as a banner.
    </p>
    <div class="field">
      <label class="field-label" for="email-field">Email</label>
      <Input
        id="email-field"
        v-model="email"
        :invalid="!emailValid"
        placeholder="you@company.com"
      />
      <Message v-if="!emailValid" variant="error" appearance="bare">
        Enter a valid email address.
      </Message>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Input, Message } from 'vael-ui'

const email = shallowRef('not-an-email')
const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value))
</script>

<style scoped>
.field {
  display: grid;
  gap: 0.375rem;
  max-width: 20rem;
  margin-block-end: 0.75rem;
}
.field-label {
  font-size: 0.8125rem;
  font-weight: 500;
}
</style>
