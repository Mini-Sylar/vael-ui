<template>
  <section class="demo">
    <h3>Async — remote search backing a virtualized list</h3>
    <p class="note">
      <code>filter="false"</code> still shows the search box, but Select does no matching of its own
      — it trusts whatever <code>items</code> it's handed. This debounces <code>query</code> into a
      fake API call and swaps <code>items</code> with the response; virtualization (already a plain
      computed off the current item count) re-evaluates automatically, so a 5,000-row remote page
      virtualizes exactly like a local one would.
    </p>
    <div class="row">
      <Select
        v-model="userId"
        v-model:query="query"
        :items="results"
        :loading="loading"
        :filter="false"
        filter-placeholder="Search 5,000 users..."
        placeholder="Pick a user"
      />
      <output class="panel-text">{{ userId ?? '(none)' }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { Select } from 'vael-ui'
import type { SelectItemData } from 'vael-ui'

// Stand-in for a server-side dataset — never sent to the client whole.
const ALL_USERS: SelectItemData[] = Array.from({ length: 5000 }, (_, i) => ({
  label: `user-${String(i).padStart(4, '0')}@example.com`,
  value: i,
}))

function fakeApiSearch(q: string): Promise<SelectItemData[]> {
  const matches = q ? ALL_USERS.filter((u) => u.label.includes(q)) : ALL_USERS.slice(0, 200)
  return new Promise((resolve) => setTimeout(() => resolve(matches), 250))
}

const query = shallowRef('')
const results = shallowRef<SelectItemData[]>(ALL_USERS.slice(0, 200))
const loading = shallowRef(false)
const userId = shallowRef<string | number | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | undefined
let requestId = 0
watch(query, (q) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const thisRequest = ++requestId
    loading.value = true
    const response = await fakeApiSearch(q)
    // Stale-response guard: a slower earlier request resolving after a newer one
    // would otherwise flash outdated results back in.
    if (thisRequest === requestId) {
      results.value = response
      loading.value = false
    }
  }, 200)
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
