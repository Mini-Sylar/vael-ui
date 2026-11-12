<template>
  <section class="demo">
    <h3>Rows with a second line of text</h3>
    <p class="note">
      <code>#label</code> sets the text of each row and leaves the rest of the row alone, so the
      keyboard and the shortcuts keep working.
    </p>
    <SplitButton :items="items" trigger-label="More deploy options" @select="onSelect">
      Deploy
      <template #label="{ item }">
        <span class="label">
          {{ item.label }}
          <span class="host">{{ item.host }}</span>
        </span>
      </template>
    </SplitButton>
    <output class="status">{{ last }}</output>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { SplitButton } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'

type Row = MenuItemData & { host?: string }

const items: MenuEntry<Row>[] = [
  { label: 'Staging', value: 'staging', host: 'staging.example.com' },
  { label: 'Preview', value: 'preview', host: 'preview.example.com' },
]
const last = shallowRef('')
const onSelect = (item: MenuItemData) => (last.value = `Deploying to ${item.label}`)
</script>

<style scoped>
.label {
  display: grid;
}
.host {
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}
.status {
  display: block;
  margin-block-start: 1rem;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
</style>
