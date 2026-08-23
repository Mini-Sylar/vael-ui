<template>
  <section class="demo">
    <h3>Custom <code>#item</code> content and a danger row</h3>
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
import type { MenuEntry, MenuItemData } from 'vael-ui'

const deployItems: MenuEntry[] = [
  { label: 'Deploy to Staging', value: 'staging' },
  { label: 'Deploy to Preview', value: 'preview' },
  { type: 'separator' },
  { label: 'Roll Back', value: 'rollback', danger: true },
]

const lastDeployAction = shallowRef('No action yet')

function onDeployOption(item: MenuItemData) {
  lastDeployAction.value = `Dropdown action: ${item.label}`
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
