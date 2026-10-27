<template>
  <section class="demo">
    <h3>Morph from the trigger</h3>
    <Popover v-model:open="open" open-on-trigger-click :motion="morph">
      <template #trigger>
        <Button variant="outline">Feedback</Button>
      </template>
      <div class="panel">
        <Textarea
          v-model="text"
          aria-label="Feedback"
          placeholder="What could be better?"
          :rows="3"
        />
        <Button size="sm" @click="open = false">Send</Button>
      </div>
    </Popover>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Popover, Textarea } from 'vael-ui'
import type { PopoverMotion } from 'vael-ui'

const open = shallowRef(false)
const text = shallowRef('')

const morph: PopoverMotion = { morph: 'trigger' }
</script>

<style scoped>
.panel {
  display: grid;
  gap: 0.75rem;
  inline-size: 16rem;
}
</style>
