<template>
  <section class="demo">
    <h3>Single select, sizes</h3>
    <div class="row">
      <SelectButton v-model="viewSm" size="sm" :items="viewItems" />
      <SelectButton v-model="viewMd" size="md" :items="viewItems" />
      <SelectButton v-model="viewLg" size="lg" :items="viewItems" />
    </div>
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

const viewSm = shallowRef<string | null>('list')
const viewMd = shallowRef<string | null>('grid')
const viewLg = shallowRef<string | null>('board')
</script>
