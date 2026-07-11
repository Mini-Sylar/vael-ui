<template>
  <section class="demo">
    <h2>Combobox</h2>
    <p class="note">
      Absorbs Autocomplete — one component, not two (every axis between them is a prop:
      <code>:filter="false"</code> + <code>v-model:query</code> for suggest-async,
      <code>allowCustom</code> for free-text). Shares Select's internals almost entirely; the
      trigger composes <code>Input</code> instead of an intrinsic button, so it gets the frame,
      focus ring, and Field wiring for free.
    </p>

    <h3>Local filter</h3>
    <p class="note">
      Default <code>filter</code> is case- and diacritic-insensitive on the label — try "cafe" to
      match "Café".
    </p>
    <div class="row">
      <Combobox v-model="city" :items="cities" placeholder="Search cities" clearable />
      <output class="panel-text">{{ city ?? '(none)' }}</output>
    </div>

    <h3>Autocomplete — async suggest (<code>:filter="false"</code>)</h3>
    <p class="note">
      Query is uncontrolled-friendly but bound here via <code>v-model:query</code> to drive a
      simulated 300ms fetch. <code>filter=false</code> means Combobox never filters locally — every
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
        placeholder="Type to search…"
      />
      <output class="panel-text">{{ asyncPick ?? '(none)' }}</output>
    </div>

    <h3>Free text — <code>allowCustom</code></h3>
    <p class="note">
      Enter with nothing matching (or blur with unmatched text) commits the raw string as the model
      and fires <code>@create</code> — the "add a tag that isn't in the list yet" pattern.
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
        {{ tag ?? '(none)' }}{{ createdLog.length ? ` — created: ${createdLog.join(', ')}` : '' }}
      </output>
    </div>

    <h3>Multiple — tags with chips (<code>multiple</code>)</h3>
    <p class="note">
      Selecting an item adds it and keeps the panel open (Select's own
      <code>multiple</code> stance); already-picked items stay in the filtered list, checkmarked,
      and clicking one again removes it. Selected items render as removable
      <code>&lt;Chip&gt;</code>s inside the input, and Backspace on an empty query removes the last
      chip. No <code>maxLabels</code> here — the field just grows with the tag list instead of
      forcing a choice between hiding chips or cramming them into a shrinking row.
    </p>
    <div class="row">
      <Combobox
        v-model="skills"
        :items="skillOptions"
        multiple
        clearable
        placeholder="Add skills…"
      />
      <output class="panel-text">{{ skills.length ? skills.join(', ') : '(none)' }}</output>
    </div>

    <h3>Multiple, capped — <code>maxLabels</code></h3>
    <p class="note">
      Same <code>multiple</code> behavior, but <code>maxLabels</code> keeps the field a fixed
      single-line height — extra selections collapse into a trailing "+N" instead of growing the
      field, mirroring Select's own <code>maxLabels</code> exactly. Pick whichever fits the layout:
      unset for "always show everything," a number for "stay compact."
    </p>
    <Combobox
      v-model="cappedSkills"
      :items="skillOptions"
      multiple
      :max-labels="2"
      placeholder="Add skills…"
    />

    <h3>Infinite query</h3>
    <p class="note">
      Same <code>@reach-end</code> contract as Select — pairs with
      <code>useInfiniteQuery</code> identically. Scroll the panel to the bottom to load more.
    </p>
    <Combobox
      v-model="pagedPick"
      :items="pagedItems"
      :loading="isFetchingNextPage"
      placeholder="Scroll to load more"
      @reach-end="fetchNextPage"
    />
    <p class="note">
      Loaded {{ pagedItems.length }} of {{ TOTAL_REMOTE_ITEMS }} —
      {{ isFetchingNextPage ? 'fetching…' : 'idle' }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { Combobox } from 'vael-ui'
import type { SelectItemData } from 'vael-ui'

const cities: SelectItemData[] = [
  { label: 'Café Rio', value: 'cafe-rio' },
  { label: 'Montréal', value: 'montreal' },
  { label: 'São Paulo', value: 'sao-paulo' },
  { label: 'Zürich', value: 'zurich' },
  { label: 'Nairobi', value: 'nairobi' },
  { label: 'Osaka', value: 'osaka' },
]
const city = shallowRef<string | number | null>(null)

// Simulated async backend: Combobox never filters when filter=false
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

const skillOptions: SelectItemData[] = [
  { label: 'Vue', value: 'vue' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'CSS', value: 'css' },
  { label: 'Accessibility', value: 'a11y' },
  { label: 'Testing', value: 'testing' },
  { label: 'Animation', value: 'animation' },
]
const skills = shallowRef<(string | number)[]>(['vue', 'typescript'])
const cappedSkills = shallowRef<(string | number)[]>(['vue', 'typescript', 'css', 'a11y'])

const tagSuggestions: SelectItemData[] = [
  { label: 'bug', value: 'bug' },
  { label: 'feature', value: 'feature' },
  { label: 'docs', value: 'docs' },
]
const tag = shallowRef<string | number | null>(null)
const createdLog = shallowRef<string[]>([])

const TOTAL_REMOTE_ITEMS = 300
const PAGE_SIZE = 40
const remoteCatalog: SelectItemData[] = Array.from({ length: TOTAL_REMOTE_ITEMS }, (_, i) => ({
  label: `Result #${i + 1}`,
  value: i,
}))
const pagedItems = shallowRef<SelectItemData[]>(remoteCatalog.slice(0, PAGE_SIZE))
const pagedPick = shallowRef<string | number | null>(null)
const isFetchingNextPage = shallowRef(false)
function fetchNextPage() {
  if (isFetchingNextPage.value) return
  if (pagedItems.value.length >= TOTAL_REMOTE_ITEMS) return
  isFetchingNextPage.value = true
  setTimeout(() => {
    pagedItems.value = remoteCatalog.slice(0, pagedItems.value.length + PAGE_SIZE)
    isFetchingNextPage.value = false
  }, 500)
}
</script>
