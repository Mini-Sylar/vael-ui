<template>
  <section class="demo">
    <h3>Disabled branch, <code>#value</code> breadcrumb slot</h3>
    <p class="note">
      "France" is disabled (its whole subtree is unreachable): expand-only rows never accept a
      selection, so a disabled branch simply can't be entered. The trigger's default label swaps for
      a breadcrumb via the <code>#value</code> slot, using the <code>path</code> it hands back.
    </p>
    <CascadeSelect v-model="city2" :items="geographyWithDisabled" placeholder="Pick a city">
      <template #value="{ selected, path: p }">
        <span v-if="selected">{{ p.join(' / ') }}</span>
        <span v-else>Pick a city</span>
      </template>
    </CascadeSelect>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { CascadeSelect } from 'vael-ui'
import type { CascadeSelectItem } from 'vael-ui'

const geography: CascadeSelectItem[] = [
  {
    label: 'Africa',
    value: 'africa',
    children: [
      {
        label: 'Ghana',
        value: 'gh',
        children: [
          { label: 'Accra', value: 'accra' },
          { label: 'Kumasi', value: 'kumasi' },
          { label: 'Tamale', value: 'tamale' },
        ],
      },
      {
        label: 'Nigeria',
        value: 'ng',
        children: [
          { label: 'Lagos', value: 'lagos' },
          { label: 'Abuja', value: 'abuja' },
        ],
      },
    ],
  },
  {
    label: 'Europe',
    value: 'europe',
    children: [
      {
        label: 'France',
        value: 'fr',
        children: [
          { label: 'Paris', value: 'paris' },
          { label: 'Lyon', value: 'lyon' },
        ],
      },
      {
        label: 'Germany',
        value: 'de',
        children: [
          { label: 'Berlin', value: 'berlin' },
          { label: 'Munich', value: 'munich' },
        ],
      },
    ],
  },
  {
    label: 'Asia',
    value: 'asia',
    children: [
      {
        label: 'Japan',
        value: 'jp',
        children: [
          { label: 'Tokyo', value: 'tokyo' },
          { label: 'Osaka', value: 'osaka' },
        ],
      },
    ],
  },
]

const geographyWithDisabled: CascadeSelectItem[] = geography.map((continent) =>
  continent.value === 'europe'
    ? {
        ...continent,
        children: continent.children?.map((country) =>
          country.value === 'fr' ? { ...country, disabled: true } : country,
        ),
      }
    : continent,
)

const city2 = shallowRef<string | number | null>(null)
</script>
