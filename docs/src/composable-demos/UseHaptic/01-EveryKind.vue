<template>
  <section class="demo">
    <h3>Every kind, with intensity</h3>
    <p class="note">
      Open this page on a phone to feel them. <code>selection</code> is the lightest tick, for a
      choice changing; <code>impact</code> is a bump, heavier for bigger moments;
      <code>notification</code> plays a short pattern for an outcome. Intensity lengthens each pulse
      on Android; iOS plays one fixed tick per pulse.
    </p>
    <p class="demo-status">
      {{ haptic.isSupported ? 'This device plays haptics.' : 'No haptics here: try a phone.' }}
      Last: <strong>{{ last }}</strong>
    </p>
    <div class="row">
      <Button size="sm" variant="secondary" @click="play('selection')">selection()</Button>
      <Button
        v-for="weight in weights"
        :key="weight"
        size="sm"
        variant="secondary"
        @click="play(`impact('${weight}')`)"
      >
        impact('{{ weight }}')
      </Button>
    </div>
    <div class="row">
      <Button
        v-for="type in outcomes"
        :key="type"
        size="sm"
        variant="secondary"
        @click="play(`notification('${type}')`)"
      >
        notification('{{ type }}')
      </Button>
    </div>
    <Field :label="`Intensity: ${intensity}×`" class="intensity">
      <Slider v-model="intensity" :min="0.5" :max="3" :step="0.5" />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Button, Field, Slider, useHaptic } from 'vael-ui'
import type { HapticImpact, HapticNotification } from 'vael-ui'

const weights: HapticImpact[] = ['light', 'medium', 'heavy']
const outcomes: HapticNotification[] = ['success', 'warning', 'error']
const intensity = shallowRef(1)
const last = shallowRef('nothing yet')

// One instance per slider step, made in setup so each reads ConfigProvider's `haptics`.
const steps = [0.5, 1, 1.5, 2, 2.5, 3]
const byIntensity = new Map(steps.map((step) => [step, useHaptic({ intensity: step })]))
const haptic = computed(() => byIntensity.get(intensity.value)!)

function play(call: string) {
  last.value = call
  const [, name, arg] = /^(\w+)\('?(\w*)'?\)$/.exec(call)!
  if (name === 'selection') haptic.value.selection()
  else if (name === 'impact') haptic.value.impact(arg as HapticImpact)
  else haptic.value.notification(arg as HapticNotification)
}
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-block-end: 0.75rem;
}
.intensity {
  max-inline-size: 18rem;
}
</style>
