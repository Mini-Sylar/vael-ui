<template>
  <section class="demo">
    <h3>Tune the roll</h3>
    <p class="note">
      The roll reads <code>--ui-duration-number</code> and <code>--ui-ease-number</code>, so set
      them on <code>:root</code> or on one number. An overshooting curve lets each digit bounce past
      its value and settle. <code>:motion="false"</code> swaps digits without rolling.
    </p>
    <div class="row">
      <SelectButton
        v-model="feel"
        :items="feels"
        :allow-empty="false"
        size="sm"
        aria-label="Roll"
      />
    </div>
    <div class="ticker">
      <span class="label">Live orders</span>
      <AnimatedNumber
        :value="orders"
        :motion="feel !== 'off'"
        :style="styles[feel]"
        class="value"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onScopeDispose, shallowRef } from 'vue'
import { AnimatedNumber, SelectButton } from 'vael-ui'

const feels = [
  { label: 'Default', value: 'default' },
  { label: 'Bouncy', value: 'bouncy' },
  { label: 'Slow', value: 'slow' },
  { label: 'Off', value: 'off' },
]
const feel = shallowRef('bouncy')
const styles: Record<string, Record<string, string> | undefined> = {
  default: undefined,
  bouncy: {
    '--ui-ease-number': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    '--ui-duration-number': '650ms',
  },
  slow: { '--ui-duration-number': '1200ms' },
  off: undefined,
}

const orders = shallowRef(1284)
const timer = setInterval(() => (orders.value += Math.ceil(Math.random() * 12)), 1600)
onScopeDispose(() => clearInterval(timer))
</script>

<style scoped>
.row {
  margin-block-end: 1rem;
}
.ticker {
  display: inline-flex;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.label {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
.value {
  font-size: 2rem;
  font-weight: 600;
}
</style>
