<!-- SelectButton with every part: three options and the indicator under the selected one. -->
<template>
  <div data-specimen class="specimen">
    <SelectButton v-model="billing" :items="items" aria-label="Billing period" />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { SelectButton } from 'vael-ui'

const items = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'Lifetime', value: 'lifetime' },
]
const billing = shallowRef('yearly')
</script>

<style scoped>
.specimen {
  display: flex;
  justify-content: center;
  inline-size: min(20rem, 100%);
}
</style>
