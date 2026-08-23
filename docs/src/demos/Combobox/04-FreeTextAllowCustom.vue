<template>
  <section class="demo">
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
import { shallowRef } from 'vue'
import { Combobox } from 'vael-ui'
import type { SelectItemData } from 'vael-ui'

const tagSuggestions: SelectItemData[] = [
  { label: 'bug', value: 'bug' },
  { label: 'feature', value: 'feature' },
  { label: 'docs', value: 'docs' },
]
const tag = shallowRef<string | number | null>(null)
const createdLog = shallowRef<string[]>([])
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
