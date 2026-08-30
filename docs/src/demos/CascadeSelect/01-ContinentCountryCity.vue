<template>
  <section class="demo">
    <h3>Continent, country, city</h3>
    <div class="row">
      <CascadeSelect v-model="city" :items="geography" placeholder="Pick a city" />
      <output class="panel-text">
        {{ city ? `Selected: ${city} (${path.join(' → ')})` : 'Nothing selected yet' }}
      </output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { CascadeSelect } from 'vael-ui'
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

const city = shallowRef<string | number | null>(null)

function findPath(items: readonly CascadeSelectItem[], value: string | number): CascadeSelectPath {
  for (const item of items) {
    if (!item.children?.length) {
      if (item.value === value) return [item.value]
    } else {
      const found = findPath(item.children, value)
      if (found.length) return [item.value, ...found]
    }
  }
  return []
}
const path = computed(() => (city.value == null ? [] : findPath(geography, city.value)))
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
