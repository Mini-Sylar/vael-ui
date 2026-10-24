<template>
  <section class="demo">
    <h3>Disabled branch, and a breadcrumb in <code>#value</code></h3>
    <p class="note">
      “France” is disabled, so you can’t open it or reach any city under it. The
      <code>#value</code> slot replaces the trigger’s label with a breadcrumb:
      <code>path</code> holds each level’s <code>value</code>, mapped back to labels here.
    </p>
    <Field label="City">
      <CascadeSelect v-model="city2" :items="geographyWithDisabled" placeholder="Pick a city">
        <template #value="{ selected, path: p }">
          <span v-if="selected">{{ pathLabels(p).join(' / ') }}</span>
          <span v-else>Pick a city</span>
        </template>
      </CascadeSelect>
    </Field>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { CascadeSelect, Field } from 'vael-ui'
import type { CascadeSelectItem, CascadeSelectPath } from 'vael-ui'

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

function pathLabels(path: CascadeSelectPath): string[] {
  const labels: string[] = []
  let level: readonly CascadeSelectItem[] | undefined = geographyWithDisabled
  for (const value of path) {
    const node: CascadeSelectItem | undefined = level?.find((item) => item.value === value)
    if (!node) break
    labels.push(node.label)
    level = node.children
  }
  return labels
}
</script>
