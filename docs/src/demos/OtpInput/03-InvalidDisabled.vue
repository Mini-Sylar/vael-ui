<template>
  <section class="demo">
    <h3>Invalid / disabled</h3>
    <div class="row">
      <Field label="Invalid">
        <OtpInput v-model="invalidCode" invalid :length="4" />
      </Field>
      <Field label="Disabled">
        <OtpInput v-model="disabledCode" disabled :length="4" />
      </Field>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, OtpInput } from 'vael-ui'

const invalidCode = shallowRef('12')
const disabledCode = shallowRef('42')
</script>
