<template>
  <section class="demo">
    <h3>Multiple</h3>
    <p class="note">
      With <code>multiple</code>, the model is an array of leaf values. Picking a city checks it and
      keeps the panel open, so you can move on to another country. <code>maxLabels</code>,
      <code>display</code> and <code>clearable</code> work as they do on Select.
    </p>
    <Field label="Office cities">
      <CascadeSelect
        v-model="cities"
        :items="geography"
        multiple
        clearable
        :max-labels="3"
        placeholder="Pick cities"
      />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { CascadeSelect, Field } from 'vael-ui'
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

const cities = shallowRef<(string | number)[]>(['accra', 'berlin'])
</script>
