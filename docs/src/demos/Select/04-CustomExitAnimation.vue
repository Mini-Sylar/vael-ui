<template>
  <section class="demo">
    <h3>Custom exit animation (motion-v)</h3>
    <p class="note">
      A <code>motion</code> object hands the panel to a motion-v spring as it opens and closes, and
      Select waits for the exit before removing it. Picking an item, pressing Escape, clicking
      outside and re-clicking the trigger all close it the same way.
    </p>
    <Field label="Destination">
      <Select
        v-model="springValue"
        :items="countries"
        placeholder="Choose a destination"
        :motion="look"
      />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { animate } from 'motion-v'
import { Field, Select } from 'vael-ui'
import type { SelectItemData, SelectMotion } from 'vael-ui'

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
  { label: 'Türkiye', value: 'TR' },
  { label: 'Poland', value: 'PL' },
  { label: 'Sweden', value: 'SE' },
  { label: 'Switzerland', value: 'CH' },
  { label: 'India', value: 'IN' },
  { label: 'China', value: 'CN' },
  { label: 'Japan', value: 'JP' },
  { label: 'South Korea', value: 'KR' },
  { label: 'Indonesia', value: 'ID' },
  { label: 'Vietnam', value: 'VN' },
  { label: 'Australia', value: 'AU' },
  { label: 'Antarctica', value: 'AQ', disabled: true },
]

const springValue = shallowRef<string | number | null>(null)

const pop = { type: 'spring', visualDuration: 0.28, bounce: 0.28 } as const
const look: SelectMotion = {
  enter: ({ panel }) => animate(panel, { scale: [0.92, 1], opacity: [0, 1] }, pop),
  leave: ({ panel }) => animate(panel, { scale: 0.92, opacity: 0 }, pop),
}
</script>
