<template>
  <section class="demo">
    <h3>Multiple, removable chips</h3>
    <p class="note">
      Every selection renders as a removable chip (each carries its own <code>×</code>, a real Tab
      stop, no need to reopen the panel to deselect one). <code>maxLabels</code> collapses the rest
      into a trailing "+N" once there are more than fit; the <code>display</code> prop can also swap
      chips entirely for a comma-joined label list or a localized count summary.
    </p>
    <Select
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
import { Select } from 'vael-ui'
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
