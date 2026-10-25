<template>
  <section class="demo">
    <h3>Extreme: a ticker that flashes its direction</h3>
    <p class="note">
      AnimatedNumber's <code>motion</code> sets the roll's duration and a slightly overshooting
      curve. Each change also replays two <code>v-animate</code> entrances through
      <code>replay</code>: the price swells and settles, and the arrow kicks in from the side it
      moved.
    </p>
    <div class="ticker">
      <span class="symbol">ACME</span>
      <span v-animate="swell" class="swell">
        <AnimatedNumber
          :value="value"
          :format="{ style: 'currency', currency: 'USD' }"
          :motion="roll"
          class="price"
          :data-trend="trend"
        />
      </span>
      <span v-animate="kick" class="arrow" :data-trend="trend" aria-hidden="true">▲</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, shallowRef } from 'vue'
import { AnimatedNumber, vAnimate } from 'vael-ui'
import type { AnimatedNumberMotion } from 'vael-ui'

const value = shallowRef(184.32)
const trend = shallowRef<'up' | 'down'>('up')
const ticks = shallowRef(0)

function tick() {
  const change = Math.round((Math.random() - 0.45) * 600) / 100
  trend.value = change >= 0 ? 'up' : 'down'
  value.value = Math.max(1, Math.round((value.value + change) * 100) / 100)
  ticks.value++
}
const timer = setInterval(tick, 1400)
onScopeDispose(() => clearInterval(timer))

const roll: AnimatedNumberMotion = { duration: 450, easing: 'pop' }

// Both replay on each tick; the arrow starts on the side it moved from and overshoots about 25%.
const swell = computed(() => ({
  initial: { scale: 1.04 },
  duration: 400,
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  replay: ticks.value,
}))
const kick = computed(() => ({
  initial: { y: trend.value === 'up' ? 6 : -6, opacity: 0 },
  spring: { damping: 0.4, response: 0.32 },
  replay: ticks.value,
}))
</script>

<style scoped>
.ticker {
  display: inline-flex;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.symbol {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.swell {
  display: inline-block;
}
/* On the number, not the swell: the swell's own transition would replace it. */
.price {
  font-size: 2rem;
  font-weight: 600;
  transition: color 600ms ease;
}
.price[data-trend='up'],
.arrow[data-trend='up'] {
  color: var(--ui-success);
}
.price[data-trend='down'],
.arrow[data-trend='down'] {
  color: var(--ui-danger);
}
.arrow {
  display: inline-block;
  font-size: 0.875rem;
}
</style>
