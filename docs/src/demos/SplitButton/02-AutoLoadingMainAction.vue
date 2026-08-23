<template>
  <section class="demo">
    <h3>Auto-loading main action</h3>
    <p class="note">
      The main action forwards straight onto its own inner <code>Button</code>, so returning a
      promise from <code>@click</code> drives Button's loading state with zero extra wiring, exactly
      like a plain <code>&lt;Button @click&gt;</code> would.
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
