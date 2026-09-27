<template>
  <section class="demo">
    <h3>Tab behavior, <code>tab-behavior</code></h3>
    <p class="note">
      Type <code>tu</code> (it partially matches <code>feature</code>) and press Tab. Unset, Tab
      just moves to the next field and the text reverts. <code>'select'</code> picks the highlighted
      option, but only after you've typed or used the arrow keys, so tabbing through a form never
      picks one by accident. <code>'create'</code> keeps exactly what you typed.
    </p>
    <div class="stack">
      <SelectButton v-model="mode" size="sm" :items="modes" />
      <div class="row">
        <Combobox
          v-model="tag"
          :items="tags"
          allow-custom
          :tab-behavior="tabBehavior"
          placeholder="Type, then press Tab"
          @create="onCreate"
        />
        <Input placeholder="Next field" />
      </div>
      <output class="panel-text">{{ tag ?? '(none)' }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { Combobox, Input, SelectButton } from 'vael-ui'
import type { ComboboxTabBehavior, SelectButtonItem, SelectItemData } from 'vael-ui'

const modes: SelectButtonItem[] = [
  { label: 'Unset', value: 'unset' },
  { label: "'select'", value: 'select' },
  { label: "'create'", value: 'create' },
]
const mode = shallowRef<string | null>('unset')
const tabBehavior = computed(() =>
  mode.value === 'unset' ? undefined : (mode.value as ComboboxTabBehavior),
)

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
.stack {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
}

.row {
  display: flex;
  gap: 0.75rem;
}

.panel-text {
  font-size: 0.8125rem;
}
</style>
