<template>
  <section class="demo">
    <h3>Masked and alphanumeric</h3>
    <div class="row">
      <Field label="PIN">
        <OtpInput v-model="pin" :length="4" mask />
      </Field>
      <Field label="Promo code">
        <OtpInput v-model="alnum" type="alphanumeric" :length="5" />
      </Field>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, OtpInput } from 'vael-ui'

const pin = shallowRef('')
const alnum = shallowRef('')
</script>
