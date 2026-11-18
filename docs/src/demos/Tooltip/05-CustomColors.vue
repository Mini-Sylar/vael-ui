<template>
  <section class="demo">
    <h3>Colours for one tooltip</h3>
    <p class="note">
      <code>ui</code> styles the tooltip of a single target. Set <code>--ui-tooltip-bg</code> and
      <code>--ui-tooltip-color</code> on <code>panel</code>; it keeps its rounded box and motion.
    </p>
    <div class="row">
      <Button v-tooltip="'Default tooltip'" size="sm" variant="secondary">Default</Button>
      <Button v-tooltip="danger" size="sm" variant="danger">Delete</Button>
      <Button v-tooltip="success" size="sm" variant="secondary">Published</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Button, vTooltip } from 'vael-ui'

const tint = (bg: string, color: string) => ({
  panel: { style: { '--ui-tooltip-bg': bg, '--ui-tooltip-color': color } },
})

const danger = { content: 'This cannot be undone', ui: tint('var(--ui-danger)', 'white') }
const success = {
  content: 'Live since 9:41',
  ui: tint('oklch(0.93 0.06 150)', 'oklch(0.35 0.1 150)'),
}
</script>
