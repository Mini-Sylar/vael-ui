<!-- Input with every part: the field, and content in its start and end slots. -->
<template>
  <div data-specimen class="specimen">
    <Input model-value="ada@lovelace.dev" placeholder="Email" aria-label="Email">
      <template #start><PhEnvelopeSimple :size="16" /></template>
      <template #end><Kbd>⌘K</Kbd></template>
    </Input>
  </div>
</template>

<script setup lang="ts">
import { Input, Kbd } from 'vael-ui'
import { PhEnvelopeSimple } from '@phosphor-icons/vue'
</script>

<style scoped>
.specimen {
  inline-size: min(20rem, 100%);
}
</style>
