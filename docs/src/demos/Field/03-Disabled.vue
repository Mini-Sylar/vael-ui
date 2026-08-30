<template>
  <section class="demo">
    <h3>Disabled (advisory, flows to the control via context)</h3>
    <div class="field-grid">
      <Field label="Locked field" label-placement="float" disabled>
        <Input v-model="lockedValue" />
      </Field>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Input } from 'vael-ui'

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
