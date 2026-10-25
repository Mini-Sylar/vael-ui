<template>
  <section class="demo">
    <h3>Extreme: a ticker that flashes its direction</h3>
    <p class="note">
      AnimatedNumber's <code>motion</code> sets the roll's duration and a slightly overshooting
      curve. Two <code>v-animate</code>s replay on each new <code>value</code>: the price swells and
      settles, and the arrow kicks in from the side it moved.
    </p>
    <div class="ticker">
      <span class="symbol">ACME</span>
      <AnimatedNumber
        v-animate="{
          initial: { scale: 1.04 },
          duration: 400,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
          replay: value,
          appear: false,
        }"
        :value="value"
        :format="{ style: 'currency', currency: 'USD' }"
        :motion="{ duration: 450, easing: 'pop' }"
        class="price"
        :data-trend="trend"
      />
      <span
        v-animate="{
          initial: { y: trend === 'up' ? 6 : -6, opacity: 0 },
          spring: { damping: 0.4, response: 0.32 },
          replay: value,
          appear: false,
        }"
        class="arrow"
        :data-trend="trend"
        aria-hidden="true"
        >▲</span
      >
    </div>
  </section>
</template>

<script setup lang="ts">
import { onScopeDispose, shallowRef } from 'vue'
import { AnimatedNumber } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

const value = shallowRef(184.32)
const trend = shallowRef<'up' | 'down'>('up')

function tick() {
  const change = Math.round((Math.random() - 0.45) * 600) / 100
  trend.value = change >= 0 ? 'up' : 'down'
  value.value = Math.max(1, Math.round((value.value + change) * 100) / 100)
}
const timer = setInterval(tick, 1400)
onScopeDispose(() => clearInterval(timer))
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
.arrow[data-trend='down'] {
  rotate: 180deg;
}
</style>
