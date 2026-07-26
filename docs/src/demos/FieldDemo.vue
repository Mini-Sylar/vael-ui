<template>
  <section class="demo">
    <h2>Field</h2>
    <p class="note">
      Field never validates anything, it owns label placement, description, error, and the
      id/<code>aria-describedby</code>/<code>aria-invalid</code> wiring every control needs. The
      wiring flows through a provide/inject context (<code>useFieldControl</code>, internal); every
      control also works with zero Field ancestor, standalone.
    </p>

    <h3>Label placement: <code>top</code> / <code>float</code> / <code>inset</code></h3>
    <p class="note">
      <code>float</code>/<code>inset</code> read focus/filled from the same context, not
      <code>:placeholder-shown</code>, needed once a control isn't a plain text input (Select's
      trigger is a button, InputNumber can be empty-but-focused). Try focusing each, then typing.
    </p>
    <div class="field-grid">
      <Field label="Top (default)" label-placement="top">
        <Input v-model="topValue" placeholder="Type to fill…" />
      </Field>
      <Field label="Float" label-placement="float">
        <Input v-model="floatValue" />
      </Field>
      <Field label="Inset" label-placement="inset">
        <Input v-model="insetValue" placeholder="Always small caption" />
      </Field>
    </div>

    <h3>Description, required marker, error</h3>
    <div class="field-grid">
      <Field
        label="Username"
        description="Visible to other members."
        required
        label-placement="float"
      >
        <Input v-model="username" />
      </Field>
      <Field label="Email" :error="emailError" label-placement="float">
        <Input v-model="email" type="email" :invalid="!!emailError" />
      </Field>
    </div>
    <div class="row">
      <Button
        size="sm"
        variant="outline"
        @click="emailError = emailError ? '' : 'Enter a valid email'"
      >
        Toggle error
      </Button>
    </div>

    <h3>Disabled (advisory, flows to the control via context)</h3>
    <div class="field-grid">
      <Field label="Locked field" label-placement="float" disabled>
        <Input v-model="lockedValue" />
      </Field>
    </div>

    <h3>Standalone, no Field ancestor</h3>
    <p class="note">
      Every control injects the field context with a safe default and works identically with no
      Field wrapping it, the wiring is additive, never required.
    </p>
    <Input placeholder="No Field above me" />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Field, Input } from 'vael-ui'

const topValue = shallowRef('')
const floatValue = shallowRef('')
const insetValue = shallowRef('')
const username = shallowRef('')
const email = shallowRef('')
const emailError = shallowRef('')
const lockedValue = shallowRef('Preset value')
</script>

<style scoped>
.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem;
  max-width: 40rem;
  margin-block-end: 0.75rem;
}
</style>
