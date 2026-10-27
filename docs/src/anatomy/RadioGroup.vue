<!-- RadioGroup with every part: the group, and three radios with a control, a label and a description. -->
<template>
  <div data-specimen class="specimen">
    <RadioGroup v-model="billing" aria-label="Billing cycle">
      <Radio value="monthly" label="Monthly" description="$29 a month, cancel anytime." />
      <Radio value="yearly" label="Yearly" description="$290 a year, two months free." />
      <Radio value="invoice" label="Pay by invoice" description="For teams of 20 seats or more." />
    </RadioGroup>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Radio, RadioGroup } from 'vael-ui'

const billing = shallowRef('yearly')
</script>

<style scoped>
.specimen {
  inline-size: min(22rem, 100%);
}
</style>
