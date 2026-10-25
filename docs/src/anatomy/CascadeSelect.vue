<!-- CascadeSelect open with every part: the chosen value in the trigger, and a filter above the menu. -->
<template>
  <div data-specimen class="specimen">
    <CascadeSelect
      v-model="city"
      v-model:open="open"
      :items="regions"
      filter
      filter-placeholder="Search cities"
      :close-on-outside="false"
      aria-label="Office"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CascadeSelect } from 'vael-ui'

const regions = [
  {
    label: 'Europe',
    value: 'europe',
    children: [
      { label: 'London', value: 'london' },
      { label: 'Paris', value: 'paris' },
      { label: 'Berlin', value: 'berlin' },
    ],
  },
  {
    label: 'Americas',
    value: 'americas',
    children: [
      { label: 'New York', value: 'new-york' },
      { label: 'Toronto', value: 'toronto' },
    ],
  },
  {
    label: 'Asia Pacific',
    value: 'apac',
    children: [
      { label: 'Tokyo', value: 'tokyo' },
      { label: 'Sydney', value: 'sydney' },
    ],
  },
]
const city = ref('paris')
// Open from the start, and kept open while you point at its parts.
const open = ref(true)
</script>

<style scoped>
.specimen {
  inline-size: min(16rem, 100%);
  min-block-size: 20rem;
}
</style>
