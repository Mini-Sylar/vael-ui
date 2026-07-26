<template>
  <section class="demo">
    <h2>Separator</h2>
    <p class="note">
      Plain divider by default, add default-slot content for a labeled break like "OR". No
      composable, no animation, a thematic break isn't a state that changes.
    </p>

    <h3>Horizontal</h3>
    <Separator />

    <h3>With a label</h3>
    <Separator>OR</Separator>

    <h3>Vertical, needs a sized container</h3>
    <div class="row separator-vertical-row">
      <span>Left</span>
      <Separator orientation="vertical" />
      <span>Right</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Separator } from 'vael-ui'
</script>

<style scoped>
.separator-vertical-row {
  align-items: stretch;
  block-size: 2rem;
}
</style>
