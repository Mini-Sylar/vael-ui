<template>
  <section class="demo">
    <Button @click="open = true">Weekly report</Button>
    <Dialog v-model:open="open" title="Weekly report" :motion="motion">
      <template #default="{ target }">
        <ul class="rows">
          <li v-for="row in rows" :key="row" :ref="target('rows')">{{ row }}</li>
        </ul>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import gsap from 'gsap'
import { Button, Dialog } from 'vael-ui'
import type { DialogMotion } from 'vael-ui'

const open = ref(false)
const rows = ['Design review', 'API cleanup', 'Release notes', 'Bug triage']

const motion: DialogMotion<'rows'> = {
  targets: { rows: {} },
  // One timeline: the panel rises, then the rows follow it.
  enter: ({ panel }, { targets }) =>
    gsap
      .timeline({ defaults: { ease: 'power3.out' } })
      .from(panel, { opacity: 0, y: 16, duration: 0.3 })
      .from(targets.rows, { opacity: 0, x: -12, duration: 0.25, stagger: 0.05 }, '-=0.1'),
  leave: ({ panel }) => gsap.to(panel, { opacity: 0, duration: 0.12 }),
}
</script>

<style scoped>
.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}
.rows li {
  padding: 0.5rem 0;
  border-top: 1px solid var(--ui-border);
}
</style>
