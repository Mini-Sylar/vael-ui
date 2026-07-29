<template>
  <ButtonGroup :orientation="orientation" aria-label="Actions">
    <Button variant="outline">Archive</Button>
    <Button variant="outline">Report</Button>
    <Button variant="outline" disabled>Snooze</Button>
  </ButtonGroup>
</template>

<script setup lang="ts">
import ButtonGroup from '../../src/components/ButtonGroup.vue'
import Button from '../../src/components/Button.vue'

withDefaults(defineProps<{ orientation?: 'horizontal' | 'vertical' }>(), {
  orientation: 'horizontal',
})
</script>
