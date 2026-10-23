<template>
  <section class="demo">
    <h3>Extreme: a ticker that flashes its direction (GSAP)</h3>
    <p class="note">
      AnimatedNumber rolls the digits; you add the rest. Here each change flashes the number green
      or red by direction, and GSAP kicks the arrow up or down. The roll runs on a slightly
      overshooting curve set through <code>--ui-ease-number</code>.
    </p>
    <div class="ticker">
      <span class="symbol">ACME</span>
      <AnimatedNumber
        ref="price"
        :value="value"
        :format="{ style: 'currency', currency: 'USD' }"
        class="price"
        :data-trend="trend"
      />
      <span ref="arrow" class="arrow" :data-trend="trend" aria-hidden="true">▲</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onScopeDispose, shallowRef, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { AnimatedNumber } from 'vael-ui'

const value = shallowRef(184.32)
const trend = shallowRef<'up' | 'down'>('up')
const price = useTemplateRef('price')
const arrow = useTemplateRef<HTMLElement>('arrow')

function tick() {
  const change = Math.round((Math.random() - 0.45) * 600) / 100
  trend.value = change >= 0 ? 'up' : 'down'
  value.value = Math.max(1, Math.round((value.value + change) * 100) / 100)
  const el = price.value?.el
  if (el) gsap.fromTo(el, { scale: 1.04 }, { scale: 1, duration: 0.4, ease: 'power3.out' })
  if (arrow.value)
    gsap.fromTo(
      arrow.value,
      { y: trend.value === 'up' ? 6 : -6, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, ease: 'back.out(3)' },
    )
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
  --ui-ease-number: cubic-bezier(0.34, 1.36, 0.64, 1);
  --ui-duration-number: 450ms;
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
