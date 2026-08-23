<template>
  <section class="demo">
    <h3>Grid layout</h3>
    <p class="note">
      The <code>&lt;Resizable&gt;</code> component itself works fine inside a CSS Grid app shell
      (sidebar, header, and main laid out via <code>grid-template-areas</code>) as long as the
      sidebar column track is <code>auto</code>, not a second value independently bound to
      <code>grid-template-columns</code> with its own transition.
      <code>&lt;Resizable&gt;</code> already transitions its own <code>inline-size</code> internally
      (and already suppresses that transition during the live drag); an <code>auto</code> track just
      follows that one value every frame. Binding the track to a second, separately-timed value on
      top of that (the mistake to avoid) gives you two independently-animating edges, handle and
      border, that visibly desync the moment they should snap back together.
    </p>
    <div class="resizable-gshell">
      <Resizable
        v-model:size="gridSidebarSize"
        :min="180"
        :max="360"
        class="resizable-gsidebar"
        aria-label="Resize sidebar"
      >
        <nav class="resizable-gnav">
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
      <header class="resizable-gheader">
        <strong>Dashboard</strong>
      </header>
      <div class="resizable-gmain">
        <h4>Revenue</h4>
        <p>Same drag, same rubber-band; the auto track just rides Resizable's own transition.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Resizable } from 'vael-ui'

const navItems = ['Overview', 'Revenue', 'Customers', 'Invoices', 'Settings']
const gridSidebarSize = shallowRef(240)
</script>

<style scoped>
.resizable-gshell {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: 2.75rem 1fr;
  grid-template-areas:
    'sidebar header'
    'sidebar main';
  block-size: 260px;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  overflow: hidden;
  margin-block-end: 1.5rem;
}
.resizable-gsidebar {
  grid-area: sidebar;
  background: var(--ui-surface);
  border-inline-end: 1px solid var(--ui-border);
  overflow-y: auto;
}
.resizable-gnav {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.75rem;
}
.resizable-gheader {
  grid-area: header;
  display: flex;
  align-items: center;
  min-inline-size: 0;
  padding-inline: 1.25rem;
  border-block-end: 1px solid var(--ui-border);
  font-size: 0.875rem;
}
.resizable-gmain {
  grid-area: main;
  min-inline-size: 0;
  padding: 1.25rem 1.5rem;
}
.resizable-gmain h4 {
  margin: 0 0 0.5rem;
  font-size: 0.9375rem;
}
.resizable-gmain p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ui-text-muted);
}
</style>
