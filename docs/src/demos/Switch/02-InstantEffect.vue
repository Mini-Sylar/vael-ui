<template>
  <section class="demo">
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

const airplaneMode = shallowRef(false)
</script>
