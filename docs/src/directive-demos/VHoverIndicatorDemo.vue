<template>
  <div class="v-hover-indicator-demo">
    <figure>
      <ul v-hover-indicator="'.row'" class="list" aria-label="Recent files">
        <li v-for="file in files" :key="file">
          <button type="button" class="row">{{ file }}</button>
        </li>
      </ul>
      <figcaption>A selector for the rows.</figcaption>
    </figure>

    <figure>
      <!-- Rows with a solid background: the highlight is a tint drawn over them. -->
      <ul v-hover-indicator.over="'.card'" class="list" aria-label="Pinned">
        <li v-for="file in pinned" :key="file">
          <button type="button" class="card">{{ file }}</button>
        </li>
      </ul>
      <figcaption><code>over</code>: a tint over solid rows.</figcaption>
    </figure>

    <figure>
      <div
        v-hover-indicator="{ itemSelector: '.row', orientation: 'horizontal' }"
        class="list bar"
        role="toolbar"
        aria-label="View"
      >
        <button v-for="view in views" :key="view" type="button" class="row">{{ view }}</button>
      </div>
      <figcaption><code>orientation: 'horizontal'</code>: items side by side.</figcaption>
    </figure>

    <figure>
      <ul
        v-hover-indicator="{ itemSelector: '.row', scope: 'ul' }"
        class="list"
        aria-label="Folders"
      >
        <li>
          <button type="button" class="row">Projects</button>
          <ul
            v-hover-indicator="{ itemSelector: '.row', scope: 'ul' }"
            class="list inner"
            aria-label="Projects"
          >
            <li v-for="name in nested" :key="name">
              <button type="button" class="row">{{ name }}</button>
            </li>
          </ul>
        </li>
        <li>
          <button type="button" class="row">Archive</button>
        </li>
      </ul>
      <figcaption><code>scope: 'ul'</code>: each list highlights only its own rows.</figcaption>
    </figure>

    <figure>
      <div class="pair">
        <ul
          v-hover-indicator="{ itemSelector: '.row', group: 'sidebar' }"
          class="list"
          aria-label="Inbox"
        >
          <li v-for="name in inbox" :key="name">
            <button type="button" class="row">{{ name }}</button>
          </li>
        </ul>
        <ul
          v-hover-indicator="{ itemSelector: '.row', group: 'sidebar' }"
          class="list"
          aria-label="Labels"
        >
          <li v-for="name in labels" :key="name">
            <button type="button" class="row">{{ name }}</button>
          </li>
        </ul>
      </div>
      <figcaption>
        <code>group</code>: pass from one list to the next and the highlight slides across.
      </figcaption>
    </figure>

    <figure>
      <ul
        v-hover-indicator="{ itemSelector: '.row', class: 'accent' }"
        class="list"
        aria-label="Plans"
      >
        <li v-for="plan in plans" :key="plan">
          <button type="button" class="row">{{ plan }}</button>
        </li>
      </ul>
      <figcaption><code>class</code>: your own look for the highlight.</figcaption>
    </figure>
  </div>
</template>

<script setup lang="ts">
import { vHoverIndicator } from 'vael-ui'

const files = ['Roadmap.md', 'Pricing.xlsx', 'Launch plan.pdf', 'Notes.txt']
const pinned = ['Team handbook', 'Brand guide', 'Q3 review']
const views = ['Day', 'Week', 'Month', 'Year']
const nested = ['Atlas', 'Orbit', 'Pulse']
const inbox = ['Primary', 'Social', 'Updates']
const labels = ['Work', 'Travel', 'Receipts']
const plans = ['Free', 'Team', 'Business']
</script>

<style scoped>
.v-hover-indicator-demo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1.25rem 1rem;
}
figure {
  display: grid;
  align-content: start;
  gap: 0.5rem;
  margin: 0;
}
figcaption {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  line-height: 1.4;
}
figcaption code {
  font-size: 0.75rem;
}
.list {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0.25rem;
  list-style: none;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.bar {
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
}
.inner {
  margin: 0.25rem 0 0.25rem 0.75rem;
}
.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.row,
.card {
  inline-size: 100%;
  padding: 0.5rem 0.625rem;
  border: 0;
  border-radius: calc(var(--ui-radius) - 4px);
  background: transparent;
  color: var(--ui-text);
  font: inherit;
  font-size: 0.875rem;
  text-align: start;
  cursor: pointer;
}
.bar .row {
  text-align: center;
}
.card {
  background: var(--ui-muted);
}
.list :deep(.accent) {
  background: color-mix(in oklch, var(--ui-primary) 16%, transparent);
  border-radius: 999px;
}
</style>
