<template>
  <section class="demo">
    <h3>Extreme: a spring close that keeps your flick</h3>
    <p class="note">
      BottomSheet already closes on a spring that starts at the finger's release speed, so a flick
      carries on. One <code>linked</code> entry on a stage element dims, rounds and shrinks the page
      with the sheet's position, drag included, and <code>overlay</code> is cleared so the page dims
      itself instead of a scrim.
    </p>
    <div ref="stage" class="stage">
      <article ref="page" class="page">
        <header class="page-head">
          <p class="page-eyebrow">Trip</p>
          <h4 class="page-title">A weekend in Lisbon</h4>
        </header>
        <ul class="page-list">
          <li v-for="stop in stops" :key="stop.time">
            <span class="page-time">{{ stop.time }}</span>
            <span>{{ stop.label }}</span>
          </li>
        </ul>
        <Button class="page-action" size="sm" @click="open = true">Share trip</Button>
      </article>
      <BottomSheet
        v-model:open="open"
        :container="stage"
        title="Share trip"
        aria-label="Share trip"
        :snap-points="[{ id: 'peek', height: 0.55 }]"
        :motion="recede"
        :ui="sheetUi"
      >
        <template #default="{ close }">
          <p class="sheet-lede">
            Lisbon, 12 to 16 May. Anyone with the link can view the itinerary.
          </p>
          <Button variant="outline" class="sheet-action" @click="close">Done</Button>
        </template>
      </BottomSheet>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Button, BottomSheet } from 'vael-ui'
import type { DialogMotion } from 'vael-ui'

const stops = [
  { time: '09:00', label: 'Pastéis at Manteigaria' },
  { time: '11:30', label: 'Tram 28 to Alfama' },
  { time: '14:00', label: 'Lunch in Príncipe Real' },
  { time: '18:45', label: 'Sunset at Miradouro' },
]

const open = shallowRef(false)
const stage = useTemplateRef('stage')
const page = useTemplateRef('page')

// The scrim would fade on its own, so it goes clear and the page dims itself instead.
const sheetUi = { overlay: { style: { background: 'transparent' } } }

// The page follows the sheet: it follows a drag too, and comes back on the sheet's own close spring.
const recede: DialogMotion = {
  linked: {
    page: {
      el: () => page.value,
      open: { scale: 0.94, borderRadius: '14px', filter: 'brightness(0.65)' },
    },
  },
}
</script>

<style scoped>
.stage {
  position: relative;
  overflow: hidden;
  block-size: 24rem;
  max-inline-size: 22rem;
  border-radius: 1.25rem;
  background: oklch(0.16 0 0);
}

.page {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--ui-surface);
  transform-origin: center top;
}

.page-head {
  display: grid;
  gap: 0.25rem;
}

.page-eyebrow {
  margin: 0;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.page-title {
  margin: 0;
  font-size: 1.25rem;
}

.page-list {
  display: grid;
  gap: 0.625rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.875rem;
}

.page-list li {
  display: flex;
  gap: 0.75rem;
}

.page-time {
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-muted);
}

.page-action {
  align-self: flex-start;
  margin-block-start: auto;
}

.sheet-lede {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}

.sheet-action {
  inline-size: 100%;
}
</style>
