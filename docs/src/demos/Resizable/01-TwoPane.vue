<template>
  <section class="demo">
    <h3>Two-pane layout</h3>
    <div ref="shell" class="resizable-shell">
      <Resizable
        v-model:size="sidebarSize"
        :min="140"
        :max="360"
        class="resizable-sidebar"
        aria-label="Resize sidebar"
      >
        <nav class="resizable-nav">
          <Button
            v-for="item in navItems"
            :key="item"
            variant="ghost"
            size="sm"
            block
            style="justify-content: flex-start"
          >
            {{ item }}
          </Button>
        </nav>
      </Resizable>
      <div class="resizable-main">
        <h4>Revenue</h4>
        <p>
          Widen or narrow the sidebar with the handle between the two panes. Drag it all the way to
          either edge to feel the resistance build past 140px and 360px.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, shallowRef, useTemplateRef } from 'vue'
import { Button, Resizable } from 'vael-ui'

const navItems = ['Overview', 'Revenue', 'Customers', 'Invoices', 'Settings']
const sidebarSize = shallowRef(240)

// On a narrow screen, start at half the shell so the main pane has room.
const shell = useTemplateRef('shell')
onMounted(() => {
  if (shell.value) sidebarSize.value = Math.max(140, Math.min(240, shell.value.clientWidth / 2))
})
</script>

<style scoped>
.resizable-shell {
  display: flex;
  block-size: 260px;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  overflow: hidden;
  margin-block-end: 1.5rem;
}
.resizable-sidebar {
  block-size: 100%;
  flex-shrink: 0;
  /* Keeps the main pane readable on narrow screens. */
  max-inline-size: calc(100% - 8rem);
  background: var(--ui-surface);
}
/* Scroll inside the pane, not on the Resizable root, so its overhanging handle isn't clipped. */
.resizable-nav {
  box-sizing: border-box;
  block-size: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.75rem;
}
.resizable-main {
  flex: 1;
  min-inline-size: 0;
  padding: 1.25rem 1.5rem;
}
.resizable-main h4 {
  margin: 0 0 0.5rem;
  font-size: 0.9375rem;
}
.resizable-main p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ui-text-muted);
}
</style>
