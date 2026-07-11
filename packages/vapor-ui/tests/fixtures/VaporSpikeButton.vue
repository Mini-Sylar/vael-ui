<template>
  <button
    type="button"
    data-testid="vapor-spike-button"
    :class="
      merge('ui-button', 'ui-button--primary', 'ui-button--md', loading && 'ui-button--loading')
    "
    :aria-busy="(loading as unknown as boolean) || undefined"
    @click="onClick"
  >
    <span class="ui-button-loader" aria-hidden="true">
      <span class="ui-loader" />
    </span>
    <span class="ui-button-content">
      <span data-testid="vapor-spike-state">{{ loading ? 'Saving…' : 'Save' }}</span>
    </span>
  </button>
</template>

<script setup lang="ts" vapor>
// Spike: proves vael-ui's composable layer works from a genuinely Vapor-authored
// component. Markup/classes mirror the real Button.vue exactly.
import { useAsyncLoading, useClassMerge } from 'vael-ui'

const { loading, run } = useAsyncLoading()
const merge = useClassMerge()

function onClick() {
  run(() => new Promise((resolve) => setTimeout(resolve, 200)))
}

defineExpose({ loading })
</script>
