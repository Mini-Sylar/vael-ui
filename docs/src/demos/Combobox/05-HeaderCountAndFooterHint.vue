<template>
  <section class="demo">
    <h3>Header result count, footer hint</h3>
    <p class="note">
      Same country list, siblings of Select's own <code>#header</code>/<code>#footer</code> demo —
      <code>header</code> gets the same live <code>count</code>/<code>total</code> as `query`
      narrows the list.
    </p>
    <div class="row">
      <Combobox
        v-model="destination"
        :items="countries"
        placeholder="Search destinations"
        clearable
      >
        <template #header="{ count, total }">{{ count }} of {{ total }}</template>
        <template #footer>Can't find it? It might still be added soon.</template>
      </Combobox>
      <output class="panel-text">{{ destination ?? '(none)' }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Combobox } from 'vael-ui'
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
const destination = shallowRef<string | number | null>(null)
</script>

<style scoped>
.row {
  display: flex;
  gap: 1rem;
}

.panel-text {
  font-size: 0.8125rem;
}
</style>
