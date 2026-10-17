<template>
  <section class="demo">
    <h3>Sizes and disabled state</h3>
    <div class="row dial-row" style="align-items: flex-end">
      <Field label="Small">
        <Dial v-model="smValue" size="sm" :min="0" :max="10" />
      </Field>
      <Field label="Medium">
        <Dial v-model="mdValue" size="md" :min="0" :max="10" />
      </Field>
      <Field label="Large">
        <Dial v-model="lgValue" size="lg" :min="0" :max="10" />
      </Field>
      <Field label="Disabled">
        <Dial v-model="disabledValue" disabled size="md" :min="0" :max="100" />
      </Field>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Dial, Field } from 'vael-ui'

const smValue = shallowRef(3)
const mdValue = shallowRef(5)
const lgValue = shallowRef(7)
const disabledValue = shallowRef(60)
</script>

<style scoped>
.dial-row {
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}
</style>
