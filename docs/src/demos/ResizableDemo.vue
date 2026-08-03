<template>
  <section class="demo">
    <h2>Resizable</h2>
    <p class="note">
      An axis-agnostic resize primitive: one draggable edge handle bound to a
      <code>v-model:size</code> number. This documentation site's own sidebar is built on it too,
      see the divider to the left of this page. Drag either handle below past its
      <code>min</code> or <code>max</code>, it keeps creeping with the same log-curve rubber-band
      resistance as PullToRefresh, then eases back to the bound on release instead of hitting a hard
      wall. See <code>useResizable.ts</code>.
    </p>

    <h3>Two-pane layout</h3>
    <div class="resizable-shell">
      <Resizable
        v-model:size="sidebarSize"
        :min="180"
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
          either edge to feel the resistance build past 180px and 360px.
        </p>
      </div>
    </div>

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

    <h3>Vertical direction</h3>
    <p class="note">
      Same composable, <code>direction="vertical"</code> measures block-size instead.
    </p>
    <div class="resizable-vshell">
      <Resizable
        v-model:size="querySize"
        direction="vertical"
        :min="120"
        :max="320"
        class="resizable-query"
        aria-label="Resize query editor"
      >
        <div class="resizable-pane-content">
          <h4>Query</h4>
          <pre class="resizable-code">
SELECT id, name, plan
FROM accounts
WHERE churn_risk &gt; 0.7
ORDER BY plan DESC;</pre>
        </div>
      </Resizable>
      <div class="resizable-results">
        <h4>Results</h4>
        <p>1,204 rows returned in 340ms.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Resizable } from 'vael-ui'

const navItems = ['Overview', 'Revenue', 'Customers', 'Invoices', 'Settings']

const sidebarSize = shallowRef(240)
const querySize = shallowRef(180)
const gridSidebarSize = shallowRef(240)
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
  background: var(--ui-surface);
  overflow-y: auto;
}
.resizable-nav {
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
.resizable-main h4,
.resizable-pane-content h4,
.resizable-results h4,
.resizable-gmain h4 {
  margin: 0 0 0.5rem;
  font-size: 0.9375rem;
}
.resizable-main p,
.resizable-results p,
.resizable-gmain p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ui-text-muted);
}
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
.resizable-vshell {
  display: flex;
  flex-direction: column;
  block-size: 340px;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  overflow: hidden;
  margin-block-end: 1.5rem;
}
.resizable-query {
  inline-size: 100%;
  background: var(--ui-surface);
  overflow-y: auto;
}
.resizable-pane-content {
  padding: 1rem 1.25rem;
}
.resizable-code {
  margin: 0;
  padding: 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  background: var(--ui-muted);
  border-radius: 0.375rem;
  overflow-x: auto;
}
.resizable-results {
  flex: 1;
  min-block-size: 0;
  padding: 1.25rem 1.5rem;
}
</style>
