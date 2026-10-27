<template>
  <section class="demo">
    <h3>Label swaps</h3>
    <p class="note">
      The new value rises into place while the old one fades out, and the box eases to the new
      width, so the button and the text after it slide instead of jumping. Press Copy link, then
      Save changes.
    </p>
    <div class="row">
      <Button variant="secondary" @click="copy">
        <AnimatedText :value="copied ? 'Copied' : 'Copy link'" />
      </Button>
      <Button :loading="state === 'saving'" loader="inline" @click="save">
        <AnimatedText :value="labels[state]" />
      </Button>
      <span class="status">Status: <AnimatedText :value="statuses[state]" /></span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onScopeDispose, shallowRef } from 'vue'
import { AnimatedText, Button } from 'vael-ui'

const copied = shallowRef(false)
const state = shallowRef<'idle' | 'saving' | 'saved'>('idle')
const labels = { idle: 'Save changes', saving: 'Saving', saved: 'Saved' }
const statuses = { idle: 'Draft', saving: 'Publishing…', saved: 'Live' }

let timers: ReturnType<typeof setTimeout>[] = []
function later(fn: () => void, ms: number) {
  timers.push(setTimeout(fn, ms))
}
function copy() {
  copied.value = true
  later(() => (copied.value = false), 1600)
}
function save() {
  state.value = 'saving'
  later(() => (state.value = 'saved'), 1200)
  later(() => (state.value = 'idle'), 3200)
}
onScopeDispose(() => timers.forEach(clearTimeout))
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.status {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
</style>
