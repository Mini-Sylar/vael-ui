<template>
  <section class="demo">
    <h3>Default (6 digits) and sizes</h3>
    <Field label="Verification code">
      <OtpInput v-model="code" @complete="onComplete" />
    </Field>
    <p class="demo-status">Value: {{ code || '(empty)' }}, completions: {{ completions }}</p>
    <div class="row" style="align-items: flex-end">
      <Field label="Small">
        <OtpInput v-model="sizeSm" size="sm" :length="4" />
      </Field>
      <Field label="Medium">
        <OtpInput v-model="sizeMd" size="md" :length="4" />
      </Field>
      <Field label="Large">
        <OtpInput v-model="sizeLg" size="lg" :length="4" />
      </Field>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, OtpInput } from 'vael-ui'

const code = shallowRef('')
const completions = shallowRef(0)
function onComplete() {
  completions.value++
}

const sizeSm = shallowRef('')
const sizeMd = shallowRef('')
const sizeLg = shallowRef('')
</script>
