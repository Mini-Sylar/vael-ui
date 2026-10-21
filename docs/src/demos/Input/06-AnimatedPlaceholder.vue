<template>
  <section class="demo">
    <h3>Animated placeholder and values</h3>
    <p class="note">
      <code>animated</code> crossfades a placeholder that changes, even while the field is focused
      and empty, and a value your code sets while you're away from the field. What you type never
      animates.
    </p>
    <div class="stack">
      <Input
        v-model="query"
        animated
        :placeholder="`Search ${things[index]}…`"
        aria-label="Search"
        class="search"
      >
        <template #start><Icon /></template>
      </Input>
      <div class="row">
        <Input v-model="title" animated placeholder="Untitled report" aria-label="Report title" />
        <Button variant="secondary" @click="suggest">Suggest a title</Button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { h, onScopeDispose, shallowRef } from 'vue'
import { Button, Input } from 'vael-ui'

const things = ['projects', 'files', 'people', 'messages']
const index = shallowRef(0)
const timer = setInterval(() => (index.value = (index.value + 1) % things.length), 2200)
onScopeDispose(() => clearInterval(timer))
const query = shallowRef('')

const titles = ['Quarterly planning notes', 'Launch checklist', 'Design review, round two']
const title = shallowRef('')
const suggest = () => (title.value = titles[Math.floor(Math.random() * titles.length)]!)

const Icon = () =>
  h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none', 'aria-hidden': 'true' }, [
    h('circle', { cx: 7, cy: 7, r: 4.5, stroke: 'currentColor', 'stroke-width': 1.5 }),
    h('path', { d: 'M10.5 10.5 14 14', stroke: 'currentColor', 'stroke-width': 1.5 }),
  ])
</script>

<style scoped>
.stack {
  display: grid;
  gap: 1rem;
  max-inline-size: 28rem;
}
.row {
  display: flex;
  gap: 0.5rem;
}
.row > :first-child {
  flex: 1;
}
</style>
