<!-- Toolbar with every part: its groups, and the overflow trigger once the end buttons no longer fit. -->
<template>
  <div data-specimen class="specimen">
    <Toolbar aria-label="Document" class="bar">
      <template #start>
        <Button size="sm" variant="ghost" icon aria-label="Bold"><PhTextB weight="bold" /></Button>
        <Button size="sm" variant="ghost" icon aria-label="Italic"><PhTextItalic /></Button>
      </template>
      <template #center>
        <Button size="sm" variant="ghost" icon aria-label="Undo"
          ><PhArrowCounterClockwise
        /></Button>
      </template>
      <template #end>
        <Button size="sm" variant="ghost" data-toolbar-overflow>Comment</Button>
        <Button size="sm" variant="ghost" data-toolbar-overflow>Share</Button>
        <Button size="sm" variant="ghost" data-toolbar-overflow>Export</Button>
      </template>
    </Toolbar>
  </div>
</template>

<script setup lang="ts">
import { Button, Toolbar } from 'vael-ui'
import { PhArrowCounterClockwise, PhTextB, PhTextItalic } from '@phosphor-icons/vue'
</script>

<style scoped>
/* Narrow enough that the end buttons fold into the overflow menu. */
.specimen {
  inline-size: 16rem;
}
.bar {
  padding: 0.25rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
</style>
