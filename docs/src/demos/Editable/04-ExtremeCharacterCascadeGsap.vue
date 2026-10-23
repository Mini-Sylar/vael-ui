<template>
  <section class="demo">
    <h3>Extreme: a saved title cascades in, letter by letter (GSAP)</h3>
    <p class="note">
      <code>#preview</code> renders one span per character, and after <code>submit</code> GSAP
      staggers them up into place, so a rename looks retyped. The inline fields in the table below
      save the same way, and each row flashes when it saves.
    </p>
    <Editable v-model="title" size="lg" aria-label="Document title" @submit="cascade">
      <template #preview="{ value }">
        <span ref="titleEl" class="title" aria-label="value">
          <span v-for="(char, i) in [...value]" :key="`${i}-${char}`" class="char">{{
            char === ' ' ? ' ' : char
          }}</span>
        </span>
      </template>
    </Editable>
    <table class="sheet">
      <tbody>
        <tr v-for="(row, i) in rows" :key="row.key" :ref="(el) => setRow(i, el as HTMLElement)">
          <th>{{ row.key }}</th>
          <td>
            <Editable v-model="row.value" size="sm" :aria-label="row.key" @submit="flash(i)" />
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { nextTick, reactive, shallowRef, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { Editable } from 'vael-ui'

const title = shallowRef('Quarterly roadmap')
const titleEl = useTemplateRef<HTMLElement>('titleEl')
const rows = reactive([
  { key: 'Owner', value: 'Ama Mensah' },
  { key: 'Status', value: 'Drafting' },
  { key: 'Due', value: 'Friday' },
])
const rowEls: HTMLElement[] = []
function setRow(index: number, el: HTMLElement | null) {
  if (el) rowEls[index] = el
}

function cascade() {
  nextTick(() => {
    const chars = titleEl.value?.querySelectorAll('.char')
    if (!chars?.length) return
    gsap.from(chars, {
      yPercent: 70,
      opacity: 0,
      stagger: 0.018,
      duration: 0.35,
      ease: 'power3.out',
    })
  })
}

function flash(index: number) {
  const row = rowEls[index]
  if (!row) return
  gsap.fromTo(
    row,
    { backgroundColor: 'color-mix(in oklab, var(--ui-primary) 18%, transparent)' },
    { backgroundColor: 'transparent', duration: 0.8, ease: 'power2.out' },
  )
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
