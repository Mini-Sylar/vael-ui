<template>
  <section class="demo">
    <h3>Two independent nav groups</h3>
    <p class="note">
      Each group opens on its own, and their lists share one highlight: move from Reports into
      Settings and it glides across instead of fading out and back in.
    </p>
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
        <MenuList :items="reports" aria-label="Reports" class="collapsible-nav-list" />
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
        <MenuList :items="settings" aria-label="Settings" class="collapsible-nav-list" />
      </Collapsible>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Collapsible, MenuList } from 'vael-ui'
import { PhCaretRight } from '@phosphor-icons/vue'

const reportsOpen = shallowRef(true)
const settingsOpen = shallowRef(true)
const reports = ['Overview', 'Revenue', 'Retention'].map((label) => ({ label, value: label }))
const settings = ['Profile', 'Billing', 'Integrations'].map((label) => ({ label, value: label }))
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
  transition: transform var(--ui-duration-enter) var(--ui-ease-out);
}
.collapsible-nav-chevron[data-open='true'] {
  transform: rotate(90deg);
}
.collapsible-nav-list {
  padding: 0 0.375rem 0.375rem;
}
</style>
