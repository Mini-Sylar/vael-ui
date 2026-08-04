<template>
  <output data-testid="outer-state">{{ outerOpen ? 'open' : 'closed' }}</output>
  <output data-testid="inner-state">{{ innerOpen ? 'open' : 'closed' }}</output>
  <Button data-testid="open-outer" @click="outerOpen = true">Open outer</Button>

  <Dialog v-model:open="outerOpen" aria-label="Outer">
    <template #default>
      <p>Outer content</p>
      <input data-testid="outer-field" aria-label="Outer field" />
      <Button data-testid="open-inner" @click="innerOpen = true">Open inner</Button>
      <Dialog v-model:open="innerOpen" aria-label="Inner">
        <template #default>
          <p>Inner content</p>
          <input data-testid="inner-field" aria-label="Inner field" />
        </template>
      </Dialog>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Dialog from '../../src/components/Dialog/Dialog.vue'
import Button from '../../src/components/Button/Button.vue'

const outerOpen = shallowRef(false)
const innerOpen = shallowRef(false)
</script>
