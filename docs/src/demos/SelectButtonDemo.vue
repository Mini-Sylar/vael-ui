<template>
  <section class="demo">
    <h2>SelectButton</h2>
    <p class="note">
      A segmented control that selects a VALUE and participates in forms (radiogroup semantics via
      native radios), not Tabs, which switches views. It borrows Tabs' sliding-indicator technique
      (<code>useTabIndicator</code>'s <code>selector</code> option) purely for the visual.
    </p>

    <h3>Single select, sizes</h3>
    <div class="row">
      <SelectButton v-model="viewSm" size="sm" :items="viewItems" />
      <SelectButton v-model="viewMd" size="md" :items="viewItems" />
      <SelectButton v-model="viewLg" size="lg" :items="viewItems" />
    </div>

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

    <h3>Multiple, per-option background, no shared indicator</h3>
    <SelectButton v-model="days" :items="dayItems" multiple />
    <p class="note">Selected: {{ days.length ? days.join(', ') : '(none)' }}</p>

    <h3>Disabled option</h3>
    <SelectButton v-model="tier" :items="tierItems" />
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
const dayItems: SelectButtonItem[] = [
  { label: 'Mon', value: 'mon' },
  { label: 'Tue', value: 'tue' },
  { label: 'Wed', value: 'wed' },
  { label: 'Thu', value: 'thu' },
  { label: 'Fri', value: 'fri' },
]
const tierItems: SelectButtonItem[] = [
  { label: 'Basic', value: 'basic' },
  { label: 'Plus', value: 'plus' },
  { label: 'Max', value: 'max', disabled: true },
]

const viewSm = shallowRef<string | null>('list')
const viewMd = shallowRef<string | null>('grid')
const viewLg = shallowRef<string | null>('board')
const clearable = shallowRef<string | null>('list')
const sticky = shallowRef<string | null>('list')
const days = shallowRef<string[]>(['mon', 'wed', 'fri'])
const tier = shallowRef<string | null>('basic')
</script>
