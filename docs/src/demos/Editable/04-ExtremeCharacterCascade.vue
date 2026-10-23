<template>
  <section class="demo">
    <h3>Extreme: a saved title cascades in, letter by letter</h3>
    <p class="note">
      <code>#preview</code> renders one span per character, each marked with
      <code>v-animate:char</code>. Siblings under one name stagger, so after <code>submit</code> the
      letters spring up into place and a rename reads as the title being retyped. In the table
      behind it, <code>replay</code> plays a row's tint again whenever its value changes.
    </p>
    <Editable v-model="title" size="lg" aria-label="Document title">
      <template #preview="{ value }">
        <span class="title">
          <span
            v-for="(char, i) in [...value]"
            :key="`${i}-${char}`"
            v-animate:char="letter"
            class="char"
            >{{ char === ' ' ? ' ' : char }}</span
          >
        </span>
      </template>
    </Editable>
    <table class="sheet">
      <tbody>
        <tr v-for="row in rows" :key="row.key" v-animate:row="{ ...tint, replay: row.value }">
          <th>{{ row.key }}</th>
          <td>
            <Editable v-model="row.value" size="sm" :aria-label="row.key" />
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import { Editable, vAnimate } from 'vael-ui'

const title = shallowRef('Quarterly roadmap')
const rows = reactive([
  { key: 'Owner', value: 'Ama Mensah' },
  { key: 'Status', value: 'Drafting' },
  { key: 'Due', value: 'Friday' },
])

// Each letter springs up from below and fades in, a beat after the one before it.
const letter = {
  initial: { opacity: 0, y: { value: 16, spring: { damping: 0.55, response: 0.35 } } },
  stagger: 0.018,
}
// A row starts tinted and fades clear whenever its value changes.
const tint = {
  initial: { backgroundColor: 'color-mix(in oklab, var(--ui-primary) 18%, transparent)' },
}
</script>

<style scoped>
.title {
  display: inline-flex;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.char {
  display: inline-block;
}
.sheet {
  margin-block-start: 1rem;
  border-collapse: collapse;
}
.sheet th {
  padding: 0.25rem 1rem 0.25rem 0;
  text-align: start;
  font-weight: 500;
  color: var(--ui-text-muted);
}
.sheet td {
  padding: 0.25rem 0;
}
</style>
