<template>
  <section class="demo">
    <h3>Invalid / disabled</h3>
    <div class="row">
      <OtpInput v-model="invalidCode" invalid :length="4" />
      <OtpInput v-model="disabledCode" disabled :length="4" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { OtpInput } from 'vael-ui'

const invalidCode = shallowRef('12')
const disabledCode = shallowRef('42')
</script>
