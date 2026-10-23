<template>
  <section class="demo">
    <h3>Extreme: a jelly thumb</h3>
    <p class="note">
      A <code>motion</code> object with a bouncy <code>spring</code> makes the thumb overshoot and
      settle. <code>states.active</code> holds it stretched while pressed.
      <code>states.checked</code>
      plays once as it turns on: the thumb squashes out of its stretch while the track gives a
      little. Click again mid-flight and it turns around from where it is.
    </p>
    <Switch v-model="enabled" label="Turbo mode" :motion="jelly" />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Switch } from 'vael-ui'
import type { SwitchMotion } from 'vael-ui'

const enabled = shallowRef(false)

const jelly: SwitchMotion = {
  spring: { damping: 0.5, response: 0.5 },
  states: {
    active: { thumb: { scale: '1.35 0.85' } },
    checked: {
      thumb: { scale: ['1.7 0.75', '0.92 1.08', 1] },
      track: { scale: ['0.94 1.06', '1.04 0.97', 1] },
    },
  },
}
</script>
