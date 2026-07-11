<template>
  <section class="demo">
    <h2>InputNumber</h2>
    <p class="note">
      Composes <code>Input</code> — the frame, focus ring, and Field wiring are Input's own.
      Intl-correct in both directions (<code>useNumberFormat</code>): keystrokes are gated to legal
      partial states while typing, the display reformats and clamps only on blur — not PrimeVue's
      live-reformat-every-keystroke approach.
    </p>

    <h3>Sizes</h3>
    <div class="row">
      <InputNumber v-model="sizeSm" size="sm" placeholder="Small" />
      <InputNumber v-model="sizeMd" size="md" placeholder="Medium" />
      <InputNumber v-model="sizeLg" size="lg" placeholder="Large" />
    </div>

    <h3>Min / max / step, with steppers</h3>
    <p class="note">
      Clamps on blur — try typing 999. ArrowUp/ArrowDown and the steppers step by
      <code>step</code>; press-and-hold repeats.
    </p>
    <InputNumber v-model="bounded" :min="0" :max="10" :step="1" />
    <p class="note">Value: {{ bounded ?? '(empty)' }}</p>

    <h3>Locale — de-DE (dot-grouped, comma decimal)</h3>
    <p class="note">
      Type <code>1.234,5</code> — the model stores the plain number <code>1234.5</code>.
    </p>
    <InputNumber v-model="deValue" locale="de-DE" />
    <p class="note">Model: {{ deValue ?? '(empty)' }}</p>

    <h3>Currency</h3>
    <InputNumber v-model="price" mode="currency" currency="USD" :min="0" :step="0.01" />

    <h3>Percent</h3>
    <p class="note">The model is the fraction (<code>0.5</code>), not <code>50</code>.</p>
    <InputNumber v-model="discount" mode="percent" :min="0" :max="1" :step="0.05" />
    <p class="note">Model: {{ discount ?? '(empty)' }}</p>

    <h3>allowEmpty=false</h3>
    <p class="note">Clearing and blurring coerces back to <code>min ?? 0</code> instead of null.</p>
    <InputNumber v-model="required" :min="1" :allow-empty="false" />

    <h3>No steppers, disabled</h3>
    <div class="row">
      <InputNumber v-model="noControls" :controls="false" placeholder="Type only" />
      <InputNumber v-model="disabledValue" disabled placeholder="Disabled" />
    </div>

    <h3>Inside a Field</h3>
    <Field label="Quantity" description="How many seats to reserve" :error="fieldError">
      <InputNumber v-model="quantity" :min="1" :max="20" />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Field, InputNumber } from 'vael-ui'

const sizeSm = shallowRef<number | null>(3)
const sizeMd = shallowRef<number | null>(3)
const sizeLg = shallowRef<number | null>(3)
const bounded = shallowRef<number | null>(5)
const deValue = shallowRef<number | null>(1234.5)
const price = shallowRef<number | null>(19.99)
const discount = shallowRef<number | null>(0.15)
const required = shallowRef<number | null>(1)
const noControls = shallowRef<number | null>(null)
const disabledValue = shallowRef<number | null>(42)
const quantity = shallowRef<number | null>(null)

const fieldError = computed(() =>
  quantity.value !== null && quantity.value > 20 ? 'Maximum 20 seats' : undefined,
)
</script>
