<template>
  <section class="demo">
    <h3>Single select, <code>allowEmpty</code></h3>
    <p class="note">
      Default <code>true</code>: clicking the active option clears it (a native radio can't do this
      alone, a click on an already-checked radio fires no <code>change</code>). Set
      <code>allowEmpty="false"</code> for RadioGroup-like behavior.
    </p>
    <div class="row">
      <SelectButton v-model="clearable" :items="viewItems" />
      <SelectButton v-model="sticky" :items="viewItems" :allow-empty="false" />
    </div>
    <p class="note">clearable: {{ clearable ?? '(none)' }} · sticky: {{ sticky ?? '(none)' }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { SelectButton } from 'vael-ui'
import type { SelectButtonItem } from 'vael-ui'

const viewItems: SelectButtonItem[] = [
  { label: 'List', value: 'list' },
  { label: 'Grid', value: 'grid' },
  { label: 'Board', value: 'board' },
]

const clearable = shallowRef<string | null>('list')
const sticky = shallowRef<string | null>('list')
</script>
