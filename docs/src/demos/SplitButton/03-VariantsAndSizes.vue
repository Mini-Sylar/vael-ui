<template>
  <section class="demo">
    <h3>Variants and sizes</h3>
    <div class="row">
      <SplitButton v-for="variant in variants" :key="variant" :variant="variant" :items="saveItems">
        {{ variant }}
      </SplitButton>
      <SplitButton disabled :items="saveItems">disabled</SplitButton>
    </div>
    <div class="row">
      <SplitButton size="sm" :items="saveItems">Small</SplitButton>
      <SplitButton size="md" :items="saveItems">Medium</SplitButton>
      <SplitButton size="lg" :items="saveItems">Large</SplitButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import { SplitButton } from 'vael-ui'
import type { ButtonVariant, MenuEntry } from 'vael-ui'

const variants: ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost', 'danger']

const saveItems: MenuEntry[] = [
  { label: 'Save As…', value: 'save-as' },
  { label: 'Save a Copy', value: 'save-copy' },
  { type: 'separator' },
  { label: 'Save & Close', value: 'save-close' },
]
</script>
