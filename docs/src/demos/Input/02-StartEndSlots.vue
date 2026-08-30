<template>
  <section class="demo">
    <h3><code>#start</code> / <code>#end</code> slots</h3>
    <p class="note">The library owns the wrapper spans, icons/kbd hints only fill them.</p>
    <div class="row">
      <Input v-model="searchValue" placeholder="Search..." class="input-fixed">
        <template #start>
          <PhMagnifyingGlass weight="bold" />
        </template>
        <template #end>
          <kbd class="input-kbd">⌘K</kbd>
        </template>
      </Input>
      <Input v-model="copyValue" placeholder="Click the button, not the frame" class="input-fixed">
        <template #end>
          <Button size="sm" variant="ghost" icon aria-label="Copy link" @click="onCopyClick">
            <PhCopy weight="bold" />
          </Button>
        </template>
      </Input>
    </div>
    <p class="note">Copy button clicks: {{ copyClicks }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Input } from 'vael-ui'
import { PhCopy, PhMagnifyingGlass } from '@phosphor-icons/vue'

const searchValue = shallowRef('')
const copyValue = shallowRef('https://vael-ui.dev')
const copyClicks = shallowRef(0)
function onCopyClick() {
  copyClicks.value++
}
</script>

<style scoped>
.input-fixed {
  max-width: 16rem;
}
.input-kbd {
  font: inherit;
  font-size: 0.6875rem;
  padding: 0.0625rem 0.375rem;
  border: 1px solid var(--ui-border-strong);
  border-radius: 4px;
  color: var(--ui-text-muted);
}
</style>
