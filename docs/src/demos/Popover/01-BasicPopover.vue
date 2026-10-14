<template>
  <section class="demo">
    <h3>Basic popover</h3>
    <p class="note">
      <code>open-on-trigger-click</code> makes the <code>#trigger</code> slot toggle the popover and
      anchors it there, with no ref or click handler to wire.
    </p>
    <Popover v-model:open="basicOpen" open-on-trigger-click>
      <template #trigger="{ open }">
        <Button>{{ open ? 'Close' : 'Open' }} popover</Button>
      </template>
      <template #default>
        <p class="panel-text">
          Plain content in the default slot. Escape, clicking outside, or re-clicking the trigger
          all close it.
        </p>
      </template>
    </Popover>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Popover } from 'vael-ui'

const basicOpen = shallowRef(false)
</script>

<style scoped>
.panel-text {
  font-size: 0.8125rem;
}
</style>
