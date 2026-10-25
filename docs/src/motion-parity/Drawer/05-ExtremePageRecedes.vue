<template>
  <section class="demo">
    <h3>Extreme: the page recedes behind the sheet</h3>
    <p class="note">
      The sheet slides up from below the stage on the iOS sheet curve, and two <code>linked</code>
      entries follow its timing: the page shrinks, sinks and rounds, and a shade dims it. Both
      reverse together on close.
    </p>
    <div ref="stage" class="stage">
      <article ref="page" class="page">
        <div ref="shade" class="page-shade" aria-hidden="true" />
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
      <Drawer
        v-model:open="open"
        :container="stage"
        side="bottom"
        :motion="sheetMotion"
        :ui="sheetUi"
        title="Share trip"
        description="Anyone with the link can view the itinerary."
      >
        <div class="share">
          <Button v-for="target in targets" :key="target" variant="outline" size="sm">
            {{ target }}
          </Button>
        </div>
      </Drawer>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Button, Drawer } from 'vael-ui'
import type { DialogMotion } from 'vael-ui'

const stops = [
  { time: '09:00', label: 'Pastéis at Manteigaria' },
  { time: '11:30', label: 'Tram 28 to Alfama' },
  { time: '14:00', label: 'Lunch in Príncipe Real' },
  { time: '18:45', label: 'Sunset at Miradouro' },
]
const targets = ['Messages', 'Mail', 'Copy link']

const stage = useTemplateRef('stage')
const page = useTemplateRef('page')
const shade = useTemplateRef('shade')
const open = shallowRef(false)

// The shade below dims the page instead, so the scrim stays clear.
const sheetUi = { overlay: { style: { background: 'transparent' } } }

// Starts below the stage, as the original does: its height, the gap under it and its shadow.
const below = 'calc(100% + 1rem + 32px)'
const sheetMotion: DialogMotion = {
  initial: { panel: { y: { value: below, duration: 480, easing: 'drawer' } } },
  exit: { panel: { y: { value: below, duration: 300, easing: 'drawer' } } },
  // On the panel's timing, so the page and the sheet move as one.
  linked: {
    page: {
      el: () => page.value,
      open: { scale: 0.94, y: 12, borderRadius: '14px' },
    },
    shade: { el: () => shade.value, open: { opacity: 0.35 } },
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

.page-shade {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  background: black;
  opacity: 0;
  pointer-events: none;
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

.share {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
