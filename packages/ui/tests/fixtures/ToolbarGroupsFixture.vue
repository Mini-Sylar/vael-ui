<template>
  <Toolbar aria-label="Grouped toolbar">
    <template #start>
      <Button data-testid="s1" size="sm" variant="ghost">S1</Button>
    </template>
    <Button data-testid="d1" size="sm" variant="ghost">D1</Button>
    <template #center>
      <Button data-testid="c1" size="sm" variant="ghost">C1</Button>
    </template>
    <template #end>
      <Button data-testid="e1" size="sm" variant="ghost">E1</Button>
    </template>
  </Toolbar>
</template>

<script setup lang="ts">
import Button from '../../src/components/Button/Button.vue'
import Toolbar from '../../src/components/Toolbar.vue'
</script>
