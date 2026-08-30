<template>
  <section class="demo">
    <h3>Infinite loading, the TanStack Query fit</h3>
    <p class="note">
      Select stays dumb: bind <code>:loading</code>, listen for <code>@reach-end</code>, append to
      your own <code>items</code> array. This is exactly the <code>useInfiniteQuery</code> shape,
      <code
        >&#64;reach-end="() =&gt; !isFetchingNextPage &amp;&amp; hasNextPage &amp;&amp;
        fetchNextPage()"</code
      >, <code>:items="data.pages.flatMap(p =&gt; p.items)"</code>,
      <code>:loading="isFetchingNextPage"</code>, no adapter needed. <code>reach-end</code> fires
      once per items-length value and re-arms only once the array actually grows, so a slow page
      fetch can't be spammed by scroll ticks in between. Scrolling far enough also crosses Select's
      own 100-item auto-virtualize threshold.
    </p>
    <Select
      v-model="pagedValue"
      :items="pagedItems"
      :loading="isFetchingNextPage"
      placeholder="Scroll to load more invoices"
      @reach-end="fetchNextPage"
    />
    <p class="note">
      Loaded {{ pagedItems.length }} of {{ TOTAL_REMOTE_ITEMS }},
      {{ isFetchingNextPage ? 'fetching…' : 'idle' }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Select } from 'vael-ui'
import type { SelectItemData } from 'vael-ui'

const TOTAL_REMOTE_ITEMS = 500
const PAGE_SIZE = 40
const remoteCatalog: SelectItemData[] = Array.from({ length: TOTAL_REMOTE_ITEMS }, (_, i) => ({
  label: `Invoice #${1000 + i}`,
  value: i,
}))
const pagedItems = shallowRef<SelectItemData[]>(remoteCatalog.slice(0, PAGE_SIZE))
const pagedValue = shallowRef<string | number | null>(null)
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
