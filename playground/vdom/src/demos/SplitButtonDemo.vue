<template>
  <section class="demo">
    <h2>SplitButton</h2>
    <p class="note">
      A primary action fused with a chevron that opens alternate actions — "Save" plus "Save As…" /
      "Save a Copy". Almost entirely composition: the main segment and the chevron are each a real
      <code>Button</code>, and the dropdown is a real <code>Menu</code> dropped into its own
      <code>#trigger</code> slot — the same shape <code>CascadeSelect</code> uses. Two separately
      focusable tab stops, not one fake compound widget: Tab from the main action lands on the
      chevron, and Menu's own keyboard handling (arrows, typeahead, Home/End) works unmodified once
      wired to it.
    </p>

    <h3>Basic — main click vs. chevron dropdown</h3>
    <div class="row">
      <SplitButton :items="saveItems" @click="onSave" @select="onSaveOption">Save</SplitButton>
      <output class="panel-text">{{ lastAction }}</output>
    </div>

    <h3><code>@click</code> is a real Button click — auto-loading included</h3>
    <p class="note">
      The main action forwards straight onto its own inner <code>Button</code>, so returning a
      promise from <code>@click</code> drives Button's own loading state with zero extra wiring —
      exactly like a plain <code>&lt;Button @click&gt;</code> would.
    </p>
    <div class="row">
      <SplitButton :items="saveItems" @click="onSlowSave">Publish</SplitButton>
    </div>

    <h3>Variants &amp; sizes — mirrors Button's own scale</h3>
    <div class="row">
      <SplitButton v-for="variant in variants" :key="variant" :variant="variant" :items="saveItems">
        {{ variant }}
      </SplitButton>
    </div>
    <div class="row">
      <SplitButton size="sm" :items="saveItems">Small</SplitButton>
      <SplitButton size="md" :items="saveItems">Medium</SplitButton>
      <SplitButton size="lg" :items="saveItems">Large</SplitButton>
    </div>

    <h3>Disabled</h3>
    <div class="row">
      <SplitButton disabled :items="saveItems">Save</SplitButton>
    </div>

    <h3>Custom <code>#item</code> content, danger row, and a <code>triggerLabel</code></h3>
    <div class="row">
      <SplitButton
        :items="deployItems"
        trigger-label="More deploy options"
        @select="onDeployOption"
      >
        Deploy
        <template #item="{ item }">
          <span class="swatch" :class="`swatch--${item.value}`" />
          {{ item.label }}
        </template>
      </SplitButton>
      <output class="panel-text">{{ lastDeployAction }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { SplitButton } from 'vael-ui'
import type { ButtonVariant, MenuEntry, MenuItemData } from 'vael-ui'

const variants: ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost', 'danger']

const saveItems: MenuEntry[] = [
  { label: 'Save As…', value: 'save-as' },
  { label: 'Save a Copy', value: 'save-copy' },
  { type: 'separator' },
  { label: 'Save & Close', value: 'save-close' },
]

const deployItems: MenuEntry[] = [
  { label: 'Deploy to Staging', value: 'staging' },
  { label: 'Deploy to Preview', value: 'preview' },
  { type: 'separator' },
  { label: 'Roll Back', value: 'rollback', danger: true },
]

const lastAction = shallowRef('No action yet')
const lastDeployAction = shallowRef('No action yet')

function onSave() {
  lastAction.value = 'Main action: Save'
}
function onSaveOption(item: MenuItemData) {
  lastAction.value = `Dropdown action: ${item.label}`
}
function onDeployOption(item: MenuItemData) {
  lastDeployAction.value = `Dropdown action: ${item.label}`
}

async function onSlowSave() {
  await new Promise((resolve) => setTimeout(resolve, 1200))
}
</script>

<style scoped>
.swatch {
  display: inline-block;
  inline-size: 0.6em;
  block-size: 0.6em;
  border-radius: 50%;
  margin-inline-end: 0.5em;
}
.swatch--staging {
  background: #f59e0b;
}
.swatch--preview {
  background: #2563eb;
}
.swatch--rollback {
  background: #dc2626;
}
</style>
