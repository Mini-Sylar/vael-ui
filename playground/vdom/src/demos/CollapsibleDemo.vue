<template>
  <section class="demo">
    <h2>Collapsible</h2>
    <p class="note">
      One independent open/closed disclosure — trigger + panel — built on the same
      <code>useCollapse</code> height-pin mechanic as <code>AccordionItem</code>, minus the "only
      one open at a time" group semantics. The two nav groups below are the motivating case: each
      owns its own <code>v-model:open</code>, so opening one never closes the other.
    </p>

    <h3>Two independent nav groups</h3>
    <div class="collapsible-nav">
      <Collapsible
        v-model:open="reportsOpen"
        class="collapsible-nav-group"
        :ui="{
          trigger: {
            style: 'width:100%',
          },
        }"
      >
        <template #trigger="{ open }">
          <Button variant="ghost" block style="justify-content: space-between">
            <span>Reports</span>
            <template #trailing>
              <span class="collapsible-nav-chevron" :data-open="open" aria-hidden="true">
                <PhCaretRight :size="12" />
              </span>
            </template>
          </Button>
        </template>
        <ul class="collapsible-nav-list">
          <li><Button variant="link">Overview</Button></li>
          <li><Button variant="link">Revenue</Button></li>
          <li><Button variant="link">Retention</Button></li>
        </ul>
      </Collapsible>

      <Collapsible
        v-model:open="settingsOpen"
        class="collapsible-nav-group"
        :ui="{
          trigger: {
            style: 'width:100%',
          },
        }"
      >
        <template #trigger="{ open }">
          <Button variant="ghost" block style="justify-content: space-between">
            <span>Settings</span>
            <template #trailing>
              <span class="collapsible-nav-chevron" :data-open="open" aria-hidden="true">
                <PhCaretRight :size="12" />
              </span>
            </template>
          </Button>
        </template>
        <ul class="collapsible-nav-list">
          <li><Button variant="link">Profile</Button></li>
          <li><Button variant="link">Billing</Button></li>
          <li><Button variant="link">Integrations</Button></li>
        </ul>
      </Collapsible>
    </div>

    <h3><code>disabled</code> — trigger click is a no-op</h3>
    <Collapsible :open="false" disabled class="collapsible-demo">
      <template #trigger="{ open }">
        <Button variant="outline" disabled>{{ open ? 'Hide' : 'Show' }} disabled panel</Button>
      </template>
      <p class="collapsible-panel-text">Never shown — the trigger above is disabled.</p>
    </Collapsible>

    <h3>Plain <code>&lt;button&gt;</code> trigger — matches the target API shape</h3>
    <Collapsible v-model:open="plainOpen" class="collapsible-demo">
      <template #trigger="{ open }">
        <button type="button" class="collapsible-plain-trigger">
          {{ open ? 'Hide' : 'Show' }} details
        </button>
      </template>
      <p class="collapsible-panel-text">
        Panel content here. The trigger element is entirely consumer-authored — Collapsible only
        wires the click-to-toggle handler and syncs
        <code>aria-expanded</code>/ <code>aria-controls</code> onto it.
      </p>
    </Collapsible>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Collapsible } from 'vael-ui'
import { PhCaretRight } from '@phosphor-icons/vue'

const reportsOpen = shallowRef(true)
const settingsOpen = shallowRef(false)
const plainOpen = shallowRef(false)
</script>

<style scoped>
.collapsible-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 20rem;
  margin-block-end: 1.5rem;
}
.collapsible-nav-group {
  border: 1px solid var(--page-border, #e4e4e7);
  border-radius: 0.5rem;
  overflow: hidden;
}
.collapsible-nav-trigger {
  inline-size: 100%;
  display: flex;
  justify-content: space-between;
}
.collapsible-nav-chevron {
  display: inline-flex;
  transition: transform 0.2s ease;
}
.collapsible-nav-chevron[data-open='true'] {
  transform: rotate(90deg);
}
.collapsible-nav-list {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  margin: 0;
  padding: 0.375rem 0.75rem 0.75rem;
  list-style: none;
}
.collapsible-demo {
  max-width: 24rem;
  margin-block-end: 1.5rem;
}
.collapsible-plain-trigger {
  font: inherit;
  padding: 0.5rem 0.875rem;
  border: 1px solid var(--page-border, #e4e4e7);
  border-radius: 0.375rem;
  background: transparent;
  cursor: pointer;
}
.collapsible-panel-text {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--page-text-muted);
}
</style>
