<template>
  <section class="demo">
    <h3>Disabled option</h3>
    <SelectButton v-model="tier" :items="tierItems" />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { SelectButton } from 'vael-ui'
import type { SelectButtonItem } from 'vael-ui'

const tierItems: SelectButtonItem[] = [
  { label: 'Basic', value: 'basic' },
  { label: 'Plus', value: 'plus' },
  { label: 'Max', value: 'max', disabled: true },
]

const tier = shallowRef<string | null>('basic')
</script>
