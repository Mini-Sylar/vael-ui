<template>
  <section class="demo">
    <h3>Inside a Field: required and invalid</h3>
    <p class="note">
      Field's <code>error</code> sets RadioGroup's <code>invalid</code> state through the same field
      context every control reads, so the group itself shows as invalid, not only the message under
      it.
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
