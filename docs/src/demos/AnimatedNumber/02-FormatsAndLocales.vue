<template>
  <section class="demo">
    <h3>Formats and locales</h3>
    <p class="note">
      <code>format</code> takes any <code>Intl.NumberFormat</code> options, and the locale follows
      <code>ConfigProvider</code> unless you set <code>locale</code>. Digits roll in the locale's
      own numbering system, Arabic-Indic included. Screen readers hear the formatted value, not the
      reels.
    </p>
    <div class="row">
      <SelectButton
        v-model="locale"
        :items="locales"
        :allow-empty="false"
        size="sm"
        aria-label="Locale"
      />
      <Button variant="secondary" size="sm" @click="shuffle">Change values</Button>
    </div>
    <dl class="stats">
      <div>
        <dt>Revenue</dt>
        <dd>
          <AnimatedNumber :value="revenue" :locale="locale" :format="currency" />
        </dd>
      </div>
      <div>
        <dt>Conversion</dt>
        <dd>
          <AnimatedNumber :value="rate" :locale="locale" :format="percent" />
        </dd>
      </div>
      <div>
        <dt>Visitors</dt>
        <dd>
          <AnimatedNumber :value="visitors" :locale="locale" :format="compact" />
        </dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { AnimatedNumber, Button, SelectButton } from 'vael-ui'

const locales = [
  { label: 'English', value: 'en-US' },
  { label: 'Deutsch', value: 'de-DE' },
  { label: 'العربية', value: 'ar-EG' },
  { label: '日本語', value: 'ja-JP' },
]
const locale = shallowRef('en-US')

const currency: Intl.NumberFormatOptions = { style: 'currency', currency: 'USD' }
const percent: Intl.NumberFormatOptions = { style: 'percent', maximumFractionDigits: 1 }
const compact: Intl.NumberFormatOptions = { notation: 'compact', maximumFractionDigits: 1 }

const revenue = shallowRef(48210.5)
const rate = shallowRef(0.042)
const visitors = shallowRef(128400)

function shuffle() {
  revenue.value = Math.round(Math.random() * 9000000) / 100
  rate.value = Math.round(Math.random() * 120) / 1000
  visitors.value = Math.round(Math.random() * 2000000)
}
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-block-end: 1.25rem;
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 1rem;
  margin: 0;
}
.stats dt {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
.stats dd {
  margin: 0.25rem 0 0;
  font-size: 1.5rem;
  font-weight: 600;
}
</style>
