<template>
  <section class="demo">
    <h3>Contained dialog</h3>
    <p class="note">
      <code>container</code> scopes a dialog to one element instead of the viewport. The overlay
      dims only that box, the modality applies only inside it, and the rest of this page stays live
      — while the dialog below is open you can still scroll the page and press the buttons above it.
      Inside the pane, everything but the dialog is <code>inert</code>: not clickable, skipped by
      Tab, hidden from screen readers.
    </p>
    <p class="note">
      <code>scroll-target</code> is the pane's inner scroller, which is what gets locked. Keeping it
      separate from <code>container</code> means the container itself never scrolls, so the panel
      can be positioned against it with plain <code>inset: 0</code>. Escape is routed by focus, so a
      contained dialog only answers to Escape pressed inside its own container.
    </p>

    <div ref="pane" class="contained-pane">
      <header class="contained-pane__bar">
        <strong>Project files</strong>
        <Button size="sm" variant="outline" @click="containedOpen = true">Move to…</Button>
      </header>
      <div ref="paneScroll" class="contained-pane__body">
        <p v-for="n in 14" :key="n" class="contained-pane__row">
          <code>src/components/File{{ n }}.vue</code>
        </p>
      </div>
    </div>

    <Dialog
      v-model:open="containedOpen"
      :container="pane"
      :scroll-target="paneScroll"
      size="sm"
      aria-label="Contained dialog"
      title="Move 3 files"
      description="Only this pane is blocked. The page around it keeps working."
    >
      <template #default>
        <p>Try scrolling the page, or clicking "Rename project" above - both still work.</p>
        <Button variant="secondary" @click="containedNestedOpen = true">
          Open a nested contained dialog
        </Button>
      </template>
      <template #footer="{ close }">
        <Button variant="ghost" @click="close()">Cancel</Button>
        <Button @click="close()">Move</Button>
      </template>
    </Dialog>

    <Dialog
      v-model:open="containedNestedOpen"
      :container="pane"
      :scroll-target="paneScroll"
      size="sm"
      aria-label="Nested contained dialog"
      title="Are you sure?"
      description="Stacks inside the same container; Escape closes this one first."
    >
      <template #footer="{ close }">
        <Button variant="ghost" @click="close()">Back</Button>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Button, Dialog } from 'vael-ui'

const pane = useTemplateRef<HTMLElement>('pane')
const paneScroll = useTemplateRef<HTMLElement>('paneScroll')
const containedOpen = shallowRef(false)
const containedNestedOpen = shallowRef(false)
</script>

<style scoped>
/* `position: relative` is required. */
.contained-pane {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--ui-border, #e4e4e7);
  border-radius: 0.75rem;
  max-inline-size: 34rem;
}

.contained-pane__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-block-end: 1px solid var(--ui-border, #e4e4e7);
}

/* The scroller is inside the container, not the container itself. */
.contained-pane__body {
  overflow-y: auto;
  max-block-size: 13rem;
  padding: 0.5rem 1rem;
}

.contained-pane__row {
  margin: 0;
  padding-block: 0.35rem;
}
</style>
