<template>
  <section class="demo">
    <h3>Extreme: a saved title cascades in, letter by letter</h3>
    <p class="note">
      <code>#preview</code> renders one span per character, each marked with
      <code>v-animate:char</code>. Siblings under one name stagger, so after <code>submit</code> the
      letters rise into place and a rename reads as the title being retyped. In the table behind it,
      <code>replay</code> plays a row's tint again on each save.
    </p>
    <Editable
      v-model="title"
      size="lg"
      aria-label="Document title"
      @submit="saved = true"
      @cancel="saved = false"
    >
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
        <tr
          v-for="(row, i) in rows"
          :key="row.key"
          v-animate="{ ...(saves[i] ? tint : {}), replay: saves[i] }"
        >
          <th>{{ row.key }}</th>
          <td>
            <Editable v-model="row.value" size="sm" :aria-label="row.key" @submit="saves[i]++" />
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue'
import { Editable, vAnimate } from 'vael-ui'

const title = shallowRef('Quarterly roadmap')
const rows = reactive([
  { key: 'Owner', value: 'Ama Mensah' },
  { key: 'Status', value: 'Drafting' },
  { key: 'Due', value: 'Friday' },
])

// Only a save brings the letters in: not the first load, not a cancel.
const saved = shallowRef(false)
const saves = reactive([0, 0, 0])

// Each letter rises from 70% of its height and fades in, a beat after the one before it.
const letter = computed(() =>
  saved.value
    ? {
        initial: { opacity: 0, y: '70%' },
        stagger: 0.018,
        duration: 350,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
      }
    : {},
)
// A saved row starts tinted and fades clear.
// Timed on the value: a lone colour change would otherwise take the short fade.
const tint = {
  initial: {
    backgroundColor: {
      value: 'color-mix(in oklab, var(--ui-primary) 18%, transparent)',
      duration: 800,
      easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
    },
  },
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
