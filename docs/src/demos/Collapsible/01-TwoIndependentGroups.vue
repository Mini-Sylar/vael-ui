<template>
  <section class="demo">
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
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Collapsible } from 'vael-ui'
import { PhCaretRight } from '@phosphor-icons/vue'

const reportsOpen = shallowRef(true)
const settingsOpen = shallowRef(false)
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
  border: 1px solid var(--ui-border);
  border-radius: 0.5rem;
  overflow: hidden;
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
</style>
