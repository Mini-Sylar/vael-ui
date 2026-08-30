<template>
  <div data-testid="plain">
    <Timeline :items="plainItems" />
  </div>

  <div data-testid="completed">
    <Timeline :items="orderItems" :completed="(item) => item.done" />
  </div>

  <div data-testid="range">
    <Timeline :items="rangeItems">
      <template #item="{ item }">{{ item.start }} – {{ item.end }}</template>
    </Timeline>
  </div>

  <div data-testid="marker">
    <Timeline :items="markerItems" :active="() => true">
      <template #marker="{ completed, active }">marker:{{ completed }}:{{ active }}</template>
    </Timeline>
  </div>

  <div data-testid="keyed">
    <Timeline :items="keyedItems" :item-key="(item) => item.id">
      <template #item="{ item }">{{ item.label }}</template>
    </Timeline>
  </div>

  <div data-testid="horizontal">
    <Timeline :items="plainItems" orientation="horizontal" />
  </div>

  <div data-testid="opposite">
    <Timeline :items="changelogItems">
      <template #opposite="{ item }">{{ item.date }}</template>
      <template #item="{ item }">{{ item.title }}</template>
    </Timeline>
  </div>

  <div data-testid="pulse-off">
    <Timeline :items="markerItems" :active="() => true" />
  </div>
  <div data-testid="pulse-on">
    <Timeline :items="markerItems" :active="() => true" pulse />
  </div>

  <div data-testid="no-motion">
    <Timeline :items="orderItems" :active="() => true" :motion-css="false" />
  </div>
  <div data-testid="motion-on">
    <Timeline :items="orderItems" :active="() => true" />
  </div>

  <div data-testid="reactive">
    <Timeline :items="reactiveItems" />
    <button type="button" data-testid="push-item" @click="reactiveItems.push('Second')">Add</button>
  </div>

  <div data-testid="current">
    <Timeline :items="plainItems" :current="currentIndex" />
    <button type="button" data-testid="advance" @click="currentIndex++">Advance</button>
  </div>

  <div data-testid="current-with-completed">
    <Timeline :items="orderItems" :current="0" :completed="(item) => item.done" />
  </div>

  <div data-testid="both-flags">
    <Timeline :items="markerItems" :completed="() => true" :active="() => true" />
  </div>
</template>

<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import Timeline from '../../src/components/Timeline/Timeline.vue'

const plainItems = ['Order placed', 'Shipped', 'Delivered']

interface Order {
  label: string
  done: boolean
}
const orderItems: Order[] = [
  { label: 'Placed', done: true },
  { label: 'Shipped', done: false },
]

interface Range {
  start: string
  end: string
}
const rangeItems: Range[] = [{ start: 'Mon', end: 'Wed' }]

const markerItems = ['x']

interface Keyed {
  id: string
  label: string
}
const keyedItems: Keyed[] = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
]

const reactiveItems = reactive<string[]>(['First'])

const currentIndex = shallowRef(0)

interface ChangelogEntry {
  date: string
  title: string
}
const changelogItems: ChangelogEntry[] = [
  { date: 'May 2025', title: 'Release channels' },
  { date: 'Apr 2025', title: 'AI assist' },
]
</script>
