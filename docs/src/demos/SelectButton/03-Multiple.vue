<template>
  <section class="demo">
    <h3>Multiple, per-option background, no shared indicator</h3>
    <SelectButton v-model="days" :items="dayItems" multiple />
    <p class="note">Selected: {{ days.length ? days.join(', ') : '(none)' }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { SelectButton } from 'vael-ui'
import type { SelectButtonItem } from 'vael-ui'

const dayItems: SelectButtonItem[] = [
  { label: 'Mon', value: 'mon' },
  { label: 'Tue', value: 'tue' },
  { label: 'Wed', value: 'wed' },
  { label: 'Thu', value: 'thu' },
  { label: 'Fri', value: 'fri' },
]

const days = shallowRef<string[]>(['mon', 'wed', 'fri'])
</script>
