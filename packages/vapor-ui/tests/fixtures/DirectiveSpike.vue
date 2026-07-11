<template>
  <button type="button" data-testid="directive-spike-change" @click="value = 'changed'">
    Change
  </button>
  <div v-my-dir="value" data-testid="directive-spike-target"></div>
  <output data-testid="directive-spike-raw-calls">{{ rawCalls }}</output>
  <output data-testid="directive-spike-effect-runs">{{ effectRuns }}</output>
  <output data-testid="directive-spike-last-value">{{ lastValue }}</output>
</template>

<script setup lang="ts" vapor>
// Spike: does a plain-function Vapor directive get RE-INVOKED when its
// bound value's reactive dependency changes (VDOM's `updated` hook
// equivalent), or is it called exactly once at mount, needing to manage its
// own reactivity internally (e.g. via watchEffect)? This determines how
// vTooltip/vScrollMask need to be rewritten for Vapor. rawCalls tracks the
// directive FUNCTION's own invocation count (outside any effect); effectRuns
// tracks a watchEffect WE set up inside it, reading the value getter.
import { shallowRef, watchEffect } from 'vue'

const value = shallowRef('initial')
const rawCalls = shallowRef(0)
const effectRuns = shallowRef(0)
const lastValue = shallowRef('')

function vMyDir(el: Element, val: unknown) {
  rawCalls.value++
  if (typeof val === 'function') {
    watchEffect(() => {
      effectRuns.value++
      lastValue.value = String((val as () => unknown)())
    })
  } else {
    lastValue.value = String(val)
  }
}
</script>
