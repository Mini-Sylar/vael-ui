<template>
  <div style="padding: 2rem; font-family: sans-serif">
    <h1>Unstyled reference (zero vael-ui CSS loaded)</h1>

    <h2>Button</h2>
    <Button @click="fakeSave">Save</Button>
    <Button icon aria-label="Add">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </Button>
    <Button>
      <template #leading>
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
          <path
            d="M8 3v10M3 8h10"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </template>
      New item
    </Button>

    <h2>Dialog</h2>
    <Button @click="open = true">Open dialog</Button>
    <Dialog v-model:open="open" title="Delete workspace" description="This cannot be undone.">
      <template #default>
        <p>Body content.</p>
      </template>
      <template #footer="{ close }">
        <Button variant="ghost" @click="close()">Cancel</Button>
        <Button variant="danger">Delete</Button>
      </template>
    </Dialog>

    <h2>Tabs</h2>
    <Tabs v-model:active="active" :items="items">
      <template #default="{ active: current, select, items: list }">
        <button
          v-for="item in list"
          :key="item"
          role="tab"
          :aria-selected="current === item"
          @click="select(item)"
        >
          {{ item }}
        </button>
      </template>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Dialog, Tabs } from 'vael-ui'

const open = shallowRef(false)
const fakeSave = () => new Promise((resolve) => setTimeout(resolve, 1200))

type Section = 'overview' | 'analytics' | 'settings'
const items: Section[] = ['overview', 'analytics', 'settings']
const active = shallowRef<Section>('overview')
</script>
