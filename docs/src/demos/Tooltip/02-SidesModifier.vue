<template>
  <section class="demo">
    <h3>Sides, modifier syntax</h3>
    <div class="row">
      <Button v-tooltip.top="'side top'" size="sm" variant="secondary">top</Button>
      <Button v-tooltip.bottom="'side bottom'" size="sm" variant="secondary">bottom</Button>
      <Button v-tooltip.left="'side left'" size="sm" variant="secondary">left</Button>
      <Button v-tooltip.right="'side right'" size="sm" variant="secondary">right</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Button, vTooltip } from 'vael-ui'
</script>
