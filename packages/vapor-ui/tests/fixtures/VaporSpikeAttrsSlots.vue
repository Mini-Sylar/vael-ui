<template>
  <button
    type="button"
    class="ui-button ui-button--outline ui-button--md"
    data-testid="vapor-attrs-slots-btn"
    @click="onRootClick"
  >
    Click me
  </button>
  <div v-if="$slots.extra" data-testid="vapor-attrs-slots-extra-wrapper">
    <slot name="extra" />
  </div>
  <output data-testid="vapor-attrs-slots-has-extra">{{ hasExtraSlot ? 'yes' : 'no' }}</output>
</template>

<script setup lang="ts" vapor>
// Spike 4: useAttrs() + useSlots() called from within a Vapor component's
// OWN script — the exact pattern Button.vue uses (inheritAttrs: false,
// manually intercepting attrs.onClick for the auto-loading wrapper, and
// `$slots.badge` truthy checks to conditionally render a slot wrapper).
// Different from the earlier spikes: those tested a Vapor PARENT reading a
// child's exposed refs; this tests a Vapor component reading its OWN
// attrs/slots, which Vue's docs specifically flag as touching
// instance-proxy-adjacent internals.
import { useAttrs, useSlots } from 'vue'

defineOptions({ inheritAttrs: false })
defineSlots<{ extra?: () => unknown }>()

const attrs = useAttrs()
const slots = useSlots()
const hasExtraSlot = !!slots.extra

function onRootClick(event: MouseEvent) {
  const handler = attrs.onClick as ((e: MouseEvent) => void) | undefined
  handler?.(event)
}
</script>
