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
</script>

<style scoped>
.resizable-shell {
  display: flex;
  block-size: 260px;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
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
.resizable-results h4 {
  margin: 0 0 0.5rem;
  font-size: 0.9375rem;
}
.resizable-main p,
.resizable-results p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--page-text-muted);
}
.resizable-vshell {
  display: flex;
  flex-direction: column;
  block-size: 340px;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
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
