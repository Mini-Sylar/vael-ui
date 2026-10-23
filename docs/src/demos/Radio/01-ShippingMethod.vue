<template>
  <section class="demo">
    <h3>Shipping method</h3>
    <p class="note">
      No keyboard code: native radios with the same name give you the full arrow-key pattern, where
      the arrows move and select and Tab enters and leaves the group. Radio only renders inside a
      RadioGroup, so every example uses both.
    </p>
    <RadioGroup v-model="shipping">
      <Radio value="standard" label="Standard" description="5-7 business days, free" />
      <Radio value="express" label="Express" description="2-3 business days, $12.00" />
      <Radio
        value="overnight"
        label="Overnight"
        description="Not available for this address"
        disabled
      />
    </RadioGroup>
    <p class="demo-status">Selected: {{ shipping ?? '(none)' }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Radio, RadioGroup } from 'vael-ui'

const shipping = shallowRef<string | null>('standard')
</script>
