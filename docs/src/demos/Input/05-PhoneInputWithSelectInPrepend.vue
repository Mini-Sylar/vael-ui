<template>
  <section class="demo">
    <h3>A phone input: a Select in Field's <code>#prepend</code></h3>
    <p class="note">
      Field's <code>#prepend</code> takes a whole control, not only text. A Select there drops its
      own border and background, so the pair reads as one field split by a single divider. With a
      real-sized country list, <code>filter</code> lets people pick one by typing.
    </p>
    <Field label="Phone" class="phone-input">
      <template #prepend>
        <Select v-model="code" :items="codes" filter aria-label="Country code">
          <template #value="{ selected }">
            {{ Array.isArray(selected) ? '' : (selected?.value ?? '') }}
          </template>
        </Select>
      </template>
      <Input v-model="number" type="tel" placeholder="555 0100" />
    </Field>
    <p class="demo-status">Value: {{ code }} {{ number || '(empty)' }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Input, Select } from 'vael-ui'
import type { SelectItemData } from 'vael-ui'

// Label carries the country name so `filter` can match on it — the trigger's own
// `#value` slot below shows just the dial code, so the field itself stays compact.
const codes: SelectItemData[] = [
  { label: 'Ghana +233', value: '+233' },
  { label: 'Nigeria +234', value: '+234' },
  { label: 'Kenya +254', value: '+254' },
  { label: 'South Africa +27', value: '+27' },
  { label: 'Egypt +20', value: '+20' },
  { label: "Côte d'Ivoire +225", value: '+225' },
  { label: 'Senegal +221', value: '+221' },
  { label: 'United States +1', value: '+1' },
  { label: 'Canada +1', value: '+1-ca' },
  { label: 'Mexico +52', value: '+52' },
  { label: 'Brazil +55', value: '+55' },
  { label: 'United Kingdom +44', value: '+44' },
  { label: 'France +33', value: '+33' },
  { label: 'Germany +49', value: '+49' },
  { label: 'Spain +34', value: '+34' },
  { label: 'Türkiye +90', value: '+90' },
  { label: 'India +91', value: '+91' },
  { label: 'China +86', value: '+86' },
  { label: 'Japan +81', value: '+81' },
  { label: 'Australia +61', value: '+61' },
]
const code = shallowRef('+233')
const number = shallowRef('')
</script>

<style scoped>
.phone-input {
  max-width: 16rem;
}
</style>
