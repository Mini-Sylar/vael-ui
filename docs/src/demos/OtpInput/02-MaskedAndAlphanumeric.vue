<template>
  <section class="demo">
    <h3>Masked and alphanumeric</h3>
    <div class="row">
      <OtpInput v-model="pin" :length="4" mask />
      <OtpInput v-model="alnum" type="alphanumeric" :length="5" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { OtpInput } from 'vael-ui'

const pin = shallowRef('')
const alnum = shallowRef('')
</script>
