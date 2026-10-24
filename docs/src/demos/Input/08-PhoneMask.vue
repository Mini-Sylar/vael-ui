<template>
  <section class="demo">
    <h3>Input mask</h3>
    <p class="note">
      A mask is a small formatter on <code>update:modelValue</code>. It keeps only the digits and
      formats them as (555) 123-4567, so typing, pasting and deleting give the same result. Send the
      digits to your server.
    </p>
    <Field class="phone-field" label="Phone" :description="`Digits: ${digits || 'none'}`">
      <Input
        ref="input"
        :model-value="phone"
        type="tel"
        inputmode="numeric"
        autocomplete="tel-national"
        placeholder="(555) 123-4567"
        @update:model-value="onUpdate"
      />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { Field, Input } from 'vael-ui'

const phone = shallowRef('')
const input = useTemplateRef('input')
const digits = computed(() => phone.value.replace(/\D/g, ''))

// Up to 10 digits, shaped as (555) 123-4567 while you type.
function formatPhone(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 10)
  if (d.length < 4) return d
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

function onUpdate(value: string) {
  phone.value = formatPhone(value)
  // Deleting a bracket or a dash formats back to the same text, so Vue has nothing to update.
  const el = input.value?.inputEl
  if (el && el.value !== phone.value) el.value = phone.value
}
</script>

<style scoped>
.phone-field {
  max-inline-size: 16rem;
}
</style>
