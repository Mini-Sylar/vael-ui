<template>
  <section class="demo">
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
  </section>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { Combobox } from 'vael-ui'
import type { SelectItemData } from 'vael-ui'

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
