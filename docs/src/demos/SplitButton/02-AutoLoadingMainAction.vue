<template>
  <section class="demo">
    <h3>Loading state from the main action</h3>
    <p class="note">
      The main action is its own <code>Button</code>, so returning a promise from
      <code>@click</code> shows its loading state with no extra code, as on a plain
      <code>&lt;Button @click&gt;</code>.
    </p>
    <div class="row">
      <SplitButton :items="saveItems" @click="onSlowSave">Publish</SplitButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import { SplitButton } from 'vael-ui'
import type { MenuEntry } from 'vael-ui'

const saveItems: MenuEntry[] = [
  { label: 'Save As…', value: 'save-as' },
  { label: 'Save a Copy', value: 'save-copy' },
  { type: 'separator' },
  { label: 'Save & Close', value: 'save-close' },
]

async function onSlowSave() {
  await new Promise((resolve) => setTimeout(resolve, 1200))
}
</script>
