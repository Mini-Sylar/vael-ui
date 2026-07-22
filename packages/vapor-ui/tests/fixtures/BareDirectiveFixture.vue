<template>
  <div data-testid="bare-scroll-mask" v-scroll-mask>content</div>
  <button data-testid="bare-tooltip" v-tooltip>Hover</button>
</template>

<script setup lang="ts" vapor>
import { vScrollMaskVapor as vScrollMask, vTooltipVapor as vTooltip } from 'vael-ui'
</script>
