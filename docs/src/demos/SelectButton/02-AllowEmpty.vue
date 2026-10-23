<template>
  <section class="demo">
    <h3>Single select, <code>allowEmpty</code></h3>
    <p class="note">
      The default, <code>true</code>, clears the active option when you click it again. A native
      radio can't do this alone, because clicking a checked radio fires no <code>change</code>. Set
      <code>:allow-empty="false"</code> to behave like a RadioGroup.
    </p>
    <div class="row">
      <SelectButton v-model="clearable" :items="viewItems" />
      <SelectButton v-model="sticky" :items="viewItems" :allow-empty="false" />
    </div>
    <p class="demo-status">
      clearable: {{ clearable ?? '(none)' }} · sticky: {{ sticky ?? '(none)' }}
    </p>
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
