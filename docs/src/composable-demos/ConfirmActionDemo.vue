<template>
  <section class="demo">
    <Button variant="danger" :loading="false" @click="onDeleteDialog">Delete account</Button>
    <Button ref="tagTrigger" variant="outline" :loading="false" @click="onRemoveTagPopover">
      urgent ×
    </Button>
    <p class="demo-status">
      Last result: <strong>{{ lastResult }}</strong>
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Button, confirmAction } from 'vael-ui'

const lastResult = shallowRef('none yet')
const tagTrigger = useTemplateRef('tagTrigger')

// Stands in for a real request.
function fakeRequest() {
  return new Promise((resolve) => setTimeout(resolve, 900))
}

// :loading="false" opts the trigger out of Button's own loading="auto":
// the awaited promise here spans the whole confirm flow (however long the
// user takes to decide), not a quick request, so auto-detecting it as
// "loading" would be wrong. fakeRequest itself, wired through onConfirm,
// is the one place a loading state is actually correct.
async function onDeleteDialog() {
  const confirmed = await confirmAction({
    title: 'Delete your account?',
    description: "This can't be undone.",
    variant: 'danger',
    onConfirm: fakeRequest,
  }).result
  lastResult.value = String(confirmed)
}

// surface: 'popover' — anchored to the button that opened it.
async function onRemoveTagPopover() {
  const confirmed = await confirmAction({
    surface: 'popover',
    triggerEl: tagTrigger.value!.el!,
    title: 'Remove tag?',
    onConfirm: fakeRequest,
  }).result
  lastResult.value = String(confirmed)
}
</script>

<style scoped>
.demo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.demo-status {
  flex-basis: 100%;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
</style>
