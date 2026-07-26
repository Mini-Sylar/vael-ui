<template>
  <section class="demo">
    <h2>Switch</h2>
    <p class="note">
      A real native <code>&lt;input type="checkbox"&gt;</code> under a styled track/thumb, same
      form/label/focus contract as Checkbox. Unlike a Checkbox in a form, a Switch's convention is
      to take effect the moment it's toggled, not wait for a submit.
    </p>

    <h3>Sizes and states</h3>
    <div class="row">
      <Switch v-model="notify" size="sm" label="Small" />
      <Switch v-model="notify" size="md" label="Medium" />
      <Switch :model-value="true" label="On" disabled />
      <Switch :model-value="false" label="Off" disabled />
      <Switch v-model="invalidSwitch" label="Invalid" invalid />
    </div>

    <h3>Instant effect: airplane mode</h3>
    <p class="note">
      Toggle rapidly, the thumb's <code>translate</code> transition is interruptible (a plain CSS
      transition, never a keyframe), so a mid-flight click reverses smoothly instead of snapping.
      Flipping it also disables the two radios below immediately, no confirm step.
    </p>
    <Switch v-model="airplaneMode" label="Airplane mode" />
    <p class="note">Wi-Fi and Bluetooth radios: {{ airplaneMode ? 'disabled' : 'available' }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Switch } from 'vael-ui'

const notify = shallowRef(true)
const invalidSwitch = shallowRef(false)
const airplaneMode = shallowRef(false)
</script>
