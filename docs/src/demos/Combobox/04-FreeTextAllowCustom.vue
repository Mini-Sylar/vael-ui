<template>
  <section class="demo">
    <h3>Free text, <code>allowCustom</code></h3>
    <p class="note">
      Typing something that isn't an existing label adds a <code>Create "…"</code> row, even when
      the text partially matches an option (type <code>tu</code>, then arrow down past
      <code>feature</code>). Picking it fires <code>@create</code>; pushing the new value into
      <code>items</code> there makes it a real option from then on. Clicking away reverts
      uncommitted text unless <code>commit-on-blur</code> is set.
    </p>
    <div class="row">
      <Combobox
        v-model="tag"
        :items="tags"
        allow-custom
        placeholder="Existing or new tag"
        @create="onCreate"
      />
      <output class="panel-text">{{ tag ?? '(none)' }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { Combobox } from 'vael-ui'
import type { SelectItemData } from 'vael-ui'

const tags = ref<SelectItemData[]>([
  { label: 'bug', value: 'bug' },
  { label: 'feature', value: 'feature' },
  { label: 'docs', value: 'docs' },
])
const tag = shallowRef<string | number | null>(null)

function onCreate(query: string) {
  tags.value.push({ label: query, value: query })
}
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
