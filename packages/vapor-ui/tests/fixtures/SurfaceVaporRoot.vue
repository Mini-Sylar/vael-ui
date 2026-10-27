<template>
  <div style="padding: 4rem">
    <Popover
      v-model:open="open"
      open-on-trigger-click
      side="right"
      :motion="{ morph: { from: 'trigger', hide: false }, surface: { filter: 'blur(1px)' } }"
    >
      <template #trigger><Button class="goo-trigger" pill>Gooey</Button></template>
      <p>Panel</p>
    </Popover>
  </div>
</template>

<script setup lang="ts" vapor>
// The built Vapor Popover with a surface.
import { shallowRef } from 'vue'
import { Button, Popover } from 'vael-ui/vapor'

const open = shallowRef(false)
defineExpose({ open })
</script>
