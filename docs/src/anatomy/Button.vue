<!-- Button with every part: leading and trailing icons around its label, and a badge. -->
<template>
  <div data-specimen class="specimen">
    <Button size="lg">
      <template #leading><PhEnvelopeSimple /></template>
      Inbox
      <template #trailing><PhCaretDown /></template>
      <template #badge><Badge variant="danger" :count="3" /></template>
    </Button>
  </div>
</template>

<script setup lang="ts">
import { Badge, Button } from 'vael-ui'
import { PhCaretDown, PhEnvelopeSimple } from '@phosphor-icons/vue'
</script>

<style scoped>
.specimen {
  display: flex;
  justify-content: center;
  inline-size: min(18rem, 100%);
}
</style>
