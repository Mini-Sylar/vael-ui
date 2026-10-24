<template>
  <section class="demo">
    <h3>Fixed panel height</h3>
    <p class="note">
      <code>maxPanelHeight</code> caps the panel's height, however much room the viewport has. Past
      that height, the option list scrolls instead of the panel growing.
    </p>
    <div class="row">
      <Field label="Destination">
        <Select
          v-model="destination"
          :items="countries"
          :max-panel-height="160"
          placeholder="Choose a destination"
        />
      </Field>
      <output class="panel-text">{{ destination ?? '(none)' }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Select } from 'vael-ui'
import type { SelectItemData } from 'vael-ui'

const countries: SelectItemData[] = [
  { label: 'Ghana', value: 'GH' },
  { label: 'Nigeria', value: 'NG' },
  { label: 'Kenya', value: 'KE' },
  { label: 'South Africa', value: 'ZA' },
  { label: 'Egypt', value: 'EG' },
  { label: 'Morocco', value: 'MA' },
  { label: "Côte d'Ivoire", value: 'CI' },
  { label: 'Senegal', value: 'SN' },
  { label: 'United States', value: 'US' },
  { label: 'Canada', value: 'CA' },
  { label: 'Mexico', value: 'MX' },
  { label: 'Brazil', value: 'BR' },
  { label: 'Argentina', value: 'AR' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'France', value: 'FR' },
  { label: 'Germany', value: 'DE' },
  { label: 'Spain', value: 'ES' },
  { label: 'Portugal', value: 'PT' },
]

const destination = shallowRef<string | number | null>(null)
</script>

<style scoped>
.row {
  display: flex;
  align-items: last baseline;
  gap: 1rem;
}

.panel-text {
  font-size: 0.8125rem;
}
</style>
