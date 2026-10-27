<template>
  <section class="demo">
    <h3>Inside a Field</h3>
    <p class="note">
      Like every control, CascadeSelect works alone and generates its own id. Inside a Field, it
      gets the label, description, error and required state with no extra code.
    </p>
    <Field
      style="max-inline-size: 16rem"
      label="Destination"
      description="Where should we ship your order?"
      :required="true"
    >
      <CascadeSelect
        v-model="city3"
        :items="geography"
        placeholder="Pick a city"
        name="destination"
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

const city3 = shallowRef<string | number | null>(null)
</script>
