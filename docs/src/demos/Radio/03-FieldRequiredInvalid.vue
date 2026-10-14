<template>
  <section class="demo">
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

const payment = shallowRef<string | null>(null)
const paymentError = shallowRef('')
function submitPayment() {
  paymentError.value = payment.value ? '' : 'Choose a payment method to continue'
}
</script>
