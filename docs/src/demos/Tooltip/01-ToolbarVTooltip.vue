<template>
  <section class="demo">
    <h3>Toolbar, <code>v-tooltip</code> directive with a shared warm group</h3>
    <div class="row">
      <Button
        v-for="item in toolbar"
        :key="item.label"
        v-tooltip="item.label"
        icon
        variant="outline"
        :aria-label="item.label"
      >
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
          <path
            :d="item.d"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Button, vTooltip } from 'vael-ui'

const toolbar = [
  { label: 'Bold', d: 'M5 2.5h4a2.5 2.5 0 0 1 0 5H5zM5 7.5h5a2.75 2.75 0 0 1 0 5.5H5z' },
  { label: 'Italic', d: 'M7 2.5h5M4 13.5h5M9.5 2.5l-3 11' },
  { label: 'Underline', d: 'M4 2.5v5a4 4 0 0 0 8 0v-5M3.5 13.5h9' },
  {
    label: 'Link',
    d: 'M6.5 9.5l3-3 M4.8 8 3.5 9.3a2.1 2.1 0 0 0 3 3L7.8 11 M11.2 8l1.3-1.3a2.1 2.1 0 0 0-3-3L8.2 5',
  },
  {
    label: 'Attach file',
    d: 'M10.5 4.5 5.9 9.1a1.5 1.5 0 0 0 2.1 2.1l5-5a3 3 0 0 0-4.2-4.2l-5 5a4.5 4.5 0 0 0 6.4 6.4l4.3-4.4',
  },
]
</script>
