<template>
  <section class="demo">
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
import { Resizable } from 'vael-ui'

const querySize = shallowRef(180)
</script>

<style scoped>
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
.resizable-pane-content h4 {
  margin: 0 0 0.5rem;
  font-size: 0.9375rem;
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
.resizable-results h4 {
  margin: 0 0 0.5rem;
  font-size: 0.9375rem;
}
.resizable-results p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ui-text-muted);
}
</style>
