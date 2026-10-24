<template>
  <section class="demo">
    <h3>Search</h3>
    <p class="note">
      <code>filter</code> adds a search box. Type a city, a country or both, such as
      <code>ghana ku</code>, and the levels become one list of matching cities, each with its
      location. The arrow keys move through the results and Enter picks one; Enter in the search box
      picks the first.
    </p>
    <div class="row">
      <Field label="City">
        <CascadeSelect v-model="city" :items="geography" filter placeholder="Pick a city" />
      </Field>
      <output class="panel-text">{{ city ?? '(none)' }}</output>
    </div>
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
        label: 'Kenya',
        value: 'ke',
        children: [
          { label: 'Nairobi', value: 'nairobi' },
          { label: 'Mombasa', value: 'mombasa' },
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
        label: 'Portugal',
        value: 'pt',
        children: [
          { label: 'Lisbon', value: 'lisbon' },
          { label: 'Porto', value: 'porto' },
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
          { label: 'Kyoto', value: 'kyoto' },
        ],
      },
    ],
  },
]
const city = shallowRef<string | null>(null)
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
}
</style>
