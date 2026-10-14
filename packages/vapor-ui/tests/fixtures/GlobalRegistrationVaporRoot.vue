<template>
  <Button data-testid="button">Save</Button>
  <Card data-testid="card">Body</Card>
  <MenuList data-testid="menu-list" :items="items" />
  <Stepper v-model="step" data-testid="stepper" :items="steps" />
  <Menu v-model:open="open" :items="items">
    <template #trigger><span>Actions</span></template>
  </Menu>
</template>

<script setup vapor lang="ts">
// No imports on purpose: every tag resolves from the app's global component registry.
import { ref } from 'vue'

const step = ref(1)
const open = ref(true)
const steps = [{ label: 'One' }, { label: 'Two' }]
const items = [
  { label: 'Edit', value: 'edit' },
  { label: 'Docs', value: 'docs', as: 'FakeLink' },
]
</script>
