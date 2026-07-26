<template>
  <section class="demo">
    <h2>Combobox</h2>
    <p class="note">
      Absorbs Autocomplete: one component, not two (every axis between them is a prop,
      <code>:filter="false"</code> plus <code>v-model:query</code> for suggest-async,
      <code>allowCustom</code> for free-text). Shares Select's internals almost entirely; the
      trigger composes <code>Input</code> instead of an intrinsic button, so it gets the frame,
      focus ring, and Field wiring for free.
    </p>

    <h3>Basic, local filter</h3>
    <p class="note">
      Same 30-country list as the Select demo, so the two feel like siblings. Default
      <code>filter</code> is case- and diacritic-insensitive on the label: try "cote" to match "Côte
      d'Ivoire", or "turkiye" to match "Türkiye".
    </p>
    <div class="row">
      <Combobox
        v-model="destination"
        :items="countries"
        placeholder="Search destinations"
        clearable
      />
      <output class="panel-text">{{ destination ?? '(none)' }}</output>
    </div>

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

    <h3>Async suggest, <code>:filter="false"</code></h3>
    <p class="note">
      Query is uncontrolled-friendly but bound here via <code>v-model:query</code> to drive a
      simulated 300ms fetch. <code>filter=false</code> means Combobox never filters locally: every
      keystroke's <code>items</code> is trusted verbatim, and <code>openOnFocus</code> defaults to
      true in this mode so results (or a loader) show up before typing even starts.
    </p>
    <div class="row">
      <Combobox
        v-model="asyncPick"
        v-model:query="asyncQuery"
        :items="asyncResults"
        :filter="false"
        :loading="asyncLoading"
        placeholder="Search cities worldwide…"
      />
      <output class="panel-text">{{ asyncPick ?? '(none)' }}</output>
    </div>

    <h3>Free text, <code>allowCustom</code></h3>
    <p class="note">
      Enter with nothing matching (or blur with unmatched text) commits the raw string as the model
      and fires <code>@create</code>: the "add a tag that isn't in the list yet" pattern.
    </p>
    <div class="row">
      <Combobox
        v-model="tag"
        :items="tagSuggestions"
        allow-custom
        placeholder="Existing or new tag"
        @create="createdLog.push($event)"
      />
      <output class="panel-text">
        {{ tag ?? '(none)' }}{{ createdLog.length ? `, created: ${createdLog.join(', ')}` : '' }}
      </output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { Combobox } from 'vael-ui'
import type { SelectItemData } from 'vael-ui'

// Kept identical to SelectDemo's own `countries` list on purpose: Select,
// Combobox, and CascadeSelect should read as one family, not three
// unrelated demos.
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
const destination = shallowRef<string | number | null>(null)
const targetMarkets = shallowRef<(string | number)[]>(['GH', 'NG', 'US'])

// Simulated async backend: Combobox never filters locally when filter=false
const remoteCities = [
  'Accra',
  'Amsterdam',
  'Auckland',
  'Bangkok',
  'Berlin',
  'Cairo',
  'Cape Town',
  'Dublin',
  'Helsinki',
  'Jakarta',
  'Lima',
  'Manila',
  'Nairobi',
  'Oslo',
  'Prague',
  'Reykjavik',
  'Santiago',
  'Seoul',
  'Tallinn',
  'Vienna',
]
const asyncQuery = shallowRef('')
const asyncPick = shallowRef<string | number | null>(null)
const asyncResults = shallowRef<SelectItemData[]>([])
const asyncLoading = shallowRef(false)
let asyncTimer: ReturnType<typeof setTimeout> | undefined
watch(asyncQuery, (query) => {
  clearTimeout(asyncTimer)
  asyncLoading.value = true
  asyncTimer = setTimeout(() => {
    const q = query.trim().toLowerCase()
    asyncResults.value = remoteCities
      .filter((name) => (q ? name.toLowerCase().includes(q) : true))
      .map((name) => ({ label: name, value: name }))
    asyncLoading.value = false
  }, 300)
})

const tagSuggestions: SelectItemData[] = [
  { label: 'bug', value: 'bug' },
  { label: 'feature', value: 'feature' },
  { label: 'docs', value: 'docs' },
]
const tag = shallowRef<string | number | null>(null)
const createdLog = shallowRef<string[]>([])
</script>
