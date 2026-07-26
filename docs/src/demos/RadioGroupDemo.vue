<template>
  <section class="demo">
    <h2>RadioGroup &amp; Radio</h2>
    <p class="note">
      Zero keyboard JS: same-name native radios give the entire APG roving-arrow-key pattern (arrows
      move AND select, Tab enters/leaves the group) for free. Radio can't render outside a
      RadioGroup, so both live in this one file.
    </p>

    <h3>Shipping method</h3>
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
    <p class="note">Selected: {{ shipping ?? '(none)' }}</p>

    <h3>Horizontal layout</h3>
    <RadioGroup v-model="size" orientation="horizontal">
      <Radio value="s" label="S" />
      <Radio value="m" label="M" />
      <Radio value="l" label="L" />
      <Radio value="xl" label="XL" />
    </RadioGroup>

    <h3>Wired through Field: required, invalid state</h3>
    <p class="note">
      Field's <code>error</code> flows into RadioGroup's own <code>invalid</code> state (it reads
      the same field context every other control does), the group itself renders as invalid, not
      just the message under it.
    </p>
    <Field label="Payment method" :error="paymentError" required>
      <RadioGroup v-model="payment">
        <Radio value="card" label="Credit card" />
        <Radio value="bank" label="Bank transfer" description="Takes 2-3 days to clear" />
      </RadioGroup>
    </Field>
    <div class="row">
      <Button size="sm" variant="outline" @click="submitPayment">Continue to review</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Field, Radio, RadioGroup } from 'vael-ui'

const shipping = shallowRef<string | null>('standard')
const size = shallowRef<string | null>('m')

const payment = shallowRef<string | null>(null)
const paymentError = shallowRef('')
function submitPayment() {
  paymentError.value = payment.value ? '' : 'Choose a payment method to continue'
}
</script>
