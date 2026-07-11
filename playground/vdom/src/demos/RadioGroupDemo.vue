<template>
  <section class="demo">
    <h2>RadioGroup &amp; Radio</h2>
    <p class="note">
      Zero keyboard JS — same-name native radios give the entire APG roving-arrow-key pattern
      (arrows move AND select, Tab enters/leaves the group) for free.
    </p>

    <h3>Vertical (default)</h3>
    <RadioGroup v-model="plan">
      <Radio value="free" label="Free" description="Good for trying things out" />
      <Radio value="pro" label="Pro" description="Best for small teams" />
      <Radio
        value="enterprise"
        label="Enterprise"
        description="Custom limits and support"
        disabled
      />
    </RadioGroup>
    <p class="note">Selected: {{ plan ?? '(none)' }}</p>

    <h3>Horizontal</h3>
    <RadioGroup v-model="size" orientation="horizontal">
      <Radio value="s" label="S" />
      <Radio value="m" label="M" />
      <Radio value="l" label="L" />
      <Radio value="xl" label="XL" />
    </RadioGroup>

    <h3>Wired through Field — label gets <code>aria-labelledby</code></h3>
    <Field label="Billing cycle" description="Applies to every workspace on this plan" required>
      <RadioGroup v-model="cycle">
        <Radio value="monthly" label="Monthly" />
        <Radio value="yearly" label="Yearly" description="Two months free" />
      </RadioGroup>
    </Field>

    <h3>Group disabled</h3>
    <RadioGroup v-model="disabledValue" disabled>
      <Radio value="a" label="Option A" />
      <Radio value="b" label="Option B" />
    </RadioGroup>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Radio, RadioGroup } from 'vael-ui'

const plan = shallowRef<string | null>('pro')
const size = shallowRef<string | null>('m')
const cycle = shallowRef<string | null>('yearly')
const disabledValue = shallowRef<string | null>('a')
</script>
