<template>
  <section class="demo">
    <h2>Checkbox &amp; Switch</h2>
    <p class="note">
      Both are real native <code>&lt;input type="checkbox"&gt;</code>s, visually hidden under a
      styled indicator — free form participation, free label-click activation, native
      <code>:focus-visible</code> (no tracked-modality attribute needed for toggles, unlike text
      inputs).
    </p>

    <h3>Checkbox — sizes &amp; states</h3>
    <div class="row">
      <Checkbox v-model="basic" size="sm" label="Small" />
      <Checkbox v-model="basic" size="md" label="Medium" />
      <Checkbox :model-value="true" label="Checked" disabled />
      <Checkbox :model-value="false" label="Unchecked" disabled />
      <Checkbox indeterminate label="Indeterminate" />
      <Checkbox v-model="invalidChecked" label="Invalid" invalid />
    </div>

    <h3>Checkbox — array model (the CheckboxGroup story)</h3>
    <p class="note">
      Vue's own native-checkbox idiom: an array <code>v-model</code> plus each box's own
      <code>value</code> — checked reflects membership, toggling adds/removes.
    </p>
    <div class="row">
      <Checkbox v-model="fruits" value="apple" label="Apple" name="fruits" />
      <Checkbox v-model="fruits" value="banana" label="Banana" name="fruits" />
      <Checkbox v-model="fruits" value="cherry" label="Cherry" name="fruits" />
    </div>
    <p class="note">Selected: {{ fruits.length ? fruits.join(', ') : '(none)' }}</p>

    <h3>Switch — sizes &amp; states</h3>
    <div class="row">
      <Switch v-model="notify" size="sm" label="Small" />
      <Switch v-model="notify" size="md" label="Medium" />
      <Switch :model-value="true" label="On" disabled />
      <Switch :model-value="false" label="Off" disabled />
      <Switch v-model="invalidSwitch" label="Invalid" invalid />
    </div>

    <h3>Switch — thumb travel</h3>
    <p class="note">
      Toggle rapidly — the thumb's <code>translate</code> transition is interruptible (a plain CSS
      transition, never a keyframe), so a mid-flight click reverses smoothly instead of snapping.
    </p>
    <Switch v-model="airplaneMode" label="Airplane mode" />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Checkbox, Switch } from 'vael-ui'

const basic = shallowRef(false)
const invalidChecked = shallowRef(false)
const fruits = shallowRef<string[]>(['banana'])
const notify = shallowRef(true)
const invalidSwitch = shallowRef(false)
const airplaneMode = shallowRef(false)
</script>
