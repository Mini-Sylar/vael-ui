<template>
  <section class="demo">
    <h2>InputNumber</h2>
    <p class="note">
      Composes <code>Input</code>: the frame, focus ring, and Field wiring are Input's own.
      Intl-correct in both directions (<code>useNumberFormat</code>): keystrokes are gated to legal
      partial states while typing, the display reformats and clamps only on blur, not a
      live-reformat-every-keystroke approach.
    </p>

    <h3>Sizes, min / max / step</h3>
    <p class="note">
      Clamps on blur, try typing 999. ArrowUp/ArrowDown and the stepper buttons step by
      <code>step</code>, press-and-hold repeats.
    </p>
    <div class="row">
      <InputNumber v-model="sizeSm" size="sm" :min="0" :max="10" placeholder="Small" />
      <InputNumber v-model="sizeMd" size="md" :min="0" :max="10" placeholder="Medium" />
      <InputNumber v-model="sizeLg" size="lg" :min="0" :max="10" placeholder="Large" />
    </div>

    <h3>Stepper position: <code>end</code> (default) vs <code>split</code></h3>
    <p class="note">
      <code>end</code> stacks +/- into one column after the value. <code>split</code> puts one
      full-height button on each side instead, closer to a quantity stepper in a cart.
    </p>
    <div class="row">
      <InputNumber v-model="qtyEnd" :min="0" :max="20" :step="1" />
      <InputNumber v-model="qtySplit" stepper-position="split" :min="0" :max="20" :step="1" />
    </div>

    <h3>Currency mode</h3>
    <p class="note">Formats and clamps as USD on blur, the model stays a plain number.</p>
    <InputNumber v-model="price" mode="currency" currency="USD" :min="0" :step="0.01" />
    <p class="note">Model: {{ price ?? '(empty)' }}</p>

    <h3>Inside a Field, with validation</h3>
    <Field label="Seats to reserve" description="Up to 20 per booking" :error="fieldError">
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
const qtyEnd = shallowRef<number | null>(2)
const qtySplit = shallowRef<number | null>(2)
const price = shallowRef<number | null>(19.99)
const quantity = shallowRef<number | null>(null)

const fieldError = computed(() =>
  quantity.value !== null && quantity.value > 20 ? 'Maximum 20 seats' : undefined,
)
</script>
