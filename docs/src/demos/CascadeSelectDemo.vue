<template>
  <section class="demo">
    <h2>CascadeSelect</h2>
    <p class="note">
      A Select-styled trigger whose panel is a literally-reused <code>Menu</code> instance: picking
      a branch (a continent, a country) opens a nested level instead of committing a value, and only
      a leaf (a city) can become the model. Hover-intent, ArrowRight/ArrowLeft, typeahead, and
      "select closes the whole chain" all come straight from <code>Menu</code>'s own submenu
      machinery. Same "world" data family as the Select and Combobox demos, just structured as a
      tree instead of a flat list.
    </p>

    <h3>Continent, country, city</h3>
    <div class="row">
      <CascadeSelect v-model="city" :items="geography" placeholder="Pick a city" />
      <output class="panel-text">
        {{ city ? `Selected: ${city} (${path.join(' → ')})` : 'Nothing selected yet' }}
      </output>
    </div>

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

    <h3>Wired to Field</h3>
    <p class="note">
      Same "standalone-or-Field" contract as every other control: no Field ancestor above, it just
      generates its own id and works. Wire it into a Field and label/description/error/required
      wiring appears for free.
    </p>
    <Field label="Destination" description="Where should we ship your order?" :required="true">
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
import { computed, shallowRef } from 'vue'
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

const city = shallowRef<string | number | null>(null)
const city2 = shallowRef<string | number | null>(null)
const city3 = shallowRef<string | number | null>(null)

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
