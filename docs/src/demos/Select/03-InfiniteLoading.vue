<template>
  <section class="demo">
    <h3>Infinite loading with TanStack Query</h3>
    <p class="note">
      Select only shows what you give it: bind <code>:loading</code>, listen for
      <code>@reach-end</code> and append to your own <code>items</code>. That matches
      <code>useInfiniteQuery</code> with no adapter:
      <code
        >&#64;reach-end="() =&gt; !isFetchingNextPage &amp;&amp; hasNextPage &amp;&amp;
        fetchNextPage()"</code
      >, <code>:items="data.pages.flatMap(p =&gt; p.items)"</code> and
      <code>:loading="isFetchingNextPage"</code>. <code>reach-end</code> fires once per list length
      and fires again only after <code>items</code> grows, so scrolling can't request a slow page
      twice. Scroll far enough and the list passes 100 items, where Select virtualizes on its own.
    </p>
    <Field style="max-inline-size: 16rem" label="Invoice">
      <Select
        v-model="pagedValue"
        :items="pagedItems"
        :loading="isFetchingNextPage"
        placeholder="Scroll to load more invoices"
        @reach-end="fetchNextPage"
      />
    </Field>
    <p class="demo-status">
      Loaded {{ pagedItems.length }} of {{ TOTAL_REMOTE_ITEMS }},
      {{ isFetchingNextPage ? 'fetching…' : 'idle' }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Select } from 'vael-ui'
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
