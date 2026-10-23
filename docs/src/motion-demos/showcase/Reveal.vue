<!-- Stat cards that fade up as they scroll into view, their numbers rolling up then, once. -->
<template>
  <section class="demo">
    <h3>Reveal on scroll</h3>
    <div class="scroller">
      <p class="hint">Scroll down</p>
      <div class="cards">
        <article v-for="stat in stats" :key="stat.label" v-animate:stats="reveal" class="card">
          <span class="label">{{ stat.label }}</span>
          <AnimatedNumber :value="stat.value" :format="stat.format" :motion="{ when: 'visible' }" />
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { AnimatedNumber, vAnimate } from 'vael-ui'

const stats = [
  {
    label: 'Revenue',
    value: 128_430,
    format: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 },
  },
  { label: 'Active users', value: 4_281, format: {} },
  { label: 'Uptime', value: 0.9994, format: { style: 'percent', maximumFractionDigits: 2 } },
] as const
// Seen once, so a touch of stagger is fine.
const reveal = {
  initial: { opacity: 0, y: 8 },
  when: 'visible' as const,
  stagger: 0.06,
  duration: 300,
  easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
}
</script>

<style scoped>
.scroller {
  block-size: 16rem;
  overflow-y: auto;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  padding: 1rem;
}
.hint {
  display: grid;
  place-items: center;
  block-size: 18rem;
  margin: 0;
  color: var(--ui-text-muted);
}
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding-block-end: 4rem;
}
.card {
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem;
  border-radius: 12px;
  background: var(--ui-muted);
}
.label {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
.card :deep(.ui-animated-number) {
  font-size: 1.125rem;
  font-weight: 600;
}
</style>
