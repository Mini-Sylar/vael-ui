<template>
  <section class="demo">
    <h3>Shipping method</h3>
    <p class="note">
      Zero keyboard JS: same-name native radios give the entire APG roving-arrow-key pattern (arrows
      move AND select, Tab enters/leaves the group) for free. Radio can't render outside a
      RadioGroup, so every example here uses both.
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
