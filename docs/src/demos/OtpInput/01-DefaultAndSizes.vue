<template>
  <section class="demo">
    <h3>Default (6 digits) and sizes</h3>
    <OtpInput v-model="code" @complete="onComplete" />
    <p class="note">Value: {{ code || '(empty)' }}, completions: {{ completions }}</p>
    <div class="row">
      <OtpInput v-model="sizeSm" size="sm" :length="4" />
      <OtpInput v-model="sizeMd" size="md" :length="4" />
      <OtpInput v-model="sizeLg" size="lg" :length="4" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { OtpInput } from 'vael-ui'

const code = shallowRef('')
const completions = shallowRef(0)
function onComplete() {
  completions.value++
}

const sizeSm = shallowRef('')
const sizeMd = shallowRef('')
const sizeLg = shallowRef('')
</script>
