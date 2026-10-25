<!-- Radio with every part: three choices, each with a control, a label and a description. -->
<template>
  <div data-specimen class="specimen">
    <RadioGroup v-model="plan" aria-label="Plan">
      <Radio value="free" label="Free" description="Up to 3 projects, community support." />
      <Radio value="team" label="Team plan" description="Unlimited projects, $29 a month." />
      <Radio value="enterprise" label="Enterprise" description="SSO, audit logs and an SLA." />
    </RadioGroup>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Radio, RadioGroup } from 'vael-ui'

const plan = shallowRef('team')
</script>

<style scoped>
.specimen {
  inline-size: min(22rem, 100%);
}
</style>
