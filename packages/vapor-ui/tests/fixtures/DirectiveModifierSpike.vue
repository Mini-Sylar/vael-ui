<template>
  <button v-tooltip.bottom="tooltipValue" data-testid="modifier-spike-target">Hover</button>
</template>

<script setup lang="ts" vapor>
// vue-tsc doesn't understand Vapor's function-directive + modifier typing (toolchain gap, not a runtime issue) — excluded from typecheck in tsconfig.json.
import { vTooltipVapor as vTooltip } from 'vael-ui'

const tooltipValue = 'Modifier test'
</script>
