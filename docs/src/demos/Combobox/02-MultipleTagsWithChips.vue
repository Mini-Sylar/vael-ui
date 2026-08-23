<template>
  <section class="demo">
    <h3>Multiple, tags with chips</h3>
    <p class="note">
      Selecting an item adds it and keeps the panel open (Select's own
      <code>multiple</code> stance); already-picked items stay in the filtered list, checkmarked,
      and clicking one again removes it. Selected items render as removable
      <code>&lt;Chip&gt;</code>s inside the input, Backspace on an empty query removes the last
      chip, and <code>maxLabels</code> caps how many show before the rest collapse into a trailing
      "+N".
    </p>
    <Combobox
      v-model="targetMarkets"
      :items="countries"
      multiple
      :max-labels="3"
      placeholder="Target markets"
    />
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
const targetMarkets = shallowRef<(string | number)[]>(['GH', 'NG', 'US'])
</script>
