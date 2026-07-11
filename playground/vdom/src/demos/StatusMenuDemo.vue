<template>
  <section class="demo">
    <h2>Status menu — custom styled</h2>
    <p class="note">
      Zero <code>items</code> — the default slot escape hatch renders fully custom
      <code>role="menuitem"</code> markup, and every row style below is this demo's own CSS, not the
      library's <code>.ui-menu-item</code> defaults. Keyboard nav, typeahead, and activation still
      work unmodified — <code>useMenu</code> only cares that children carry
      <code>role="menuitem"</code>, never how they look.
    </p>
    <div ref="stageRef" class="status-stage">
      <Menu v-if="teleportTarget" ref="menuRef" :teleport-to="teleportTarget">
        <template #trigger>
          <button class="status-trigger" type="button">
            <span class="status-dot" :style="{ background: currentStatus.color }" />
            {{ currentStatus.label }}
          </button>
        </template>
        <template #default>
          <button
            v-for="status in statuses"
            :key="status.value"
            role="menuitem"
            class="status-row"
            @click="setStatus(status)"
          >
            <span class="status-dot" :style="{ background: status.color }" />
            <span class="status-copy">
              <strong>{{ status.label }}</strong>
              <small>{{ status.hint }}</small>
            </span>
            <svg
              v-if="status.value === currentStatus.value"
              class="status-check"
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 8.5l3 3 7-7"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </template>
      </Menu>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue'
import { Menu } from 'vael-ui'

interface Status {
  value: string
  label: string
  hint: string
  color: string
}

const statuses: Status[] = [
  { value: 'online', label: 'Online', hint: 'Visible to everyone', color: '#22c55e' },
  { value: 'away', label: 'Away', hint: 'Back in a bit', color: '#f59e0b' },
  { value: 'dnd', label: 'Do not disturb', hint: 'Notifications paused', color: '#ef4444' },
  { value: 'offline', label: 'Appear offline', hint: 'Hide your status', color: '#71717a' },
]

const currentStatus = shallowRef<Status>(statuses[0])
const menuRef = useTemplateRef('menuRef')
function setStatus(status: Status) {
  currentStatus.value = status
  menuRef.value?.close()
}

const stageRef = useTemplateRef('stageRef')
// Local teleport target (not document.body) so the panel stays inside this
// component's own DOM subtree — scoped :deep() below needs real ancestry to
// match, same reasoning as SpotlightMenuDemo and Bloom.
const teleportTarget = shallowRef<HTMLElement | null>(null)
let teleportTargetEl: HTMLElement | null = null
onMounted(() => {
  teleportTargetEl = document.createElement('div')
  stageRef.value?.appendChild(teleportTargetEl)
  teleportTarget.value = teleportTargetEl
})
onUnmounted(() => teleportTargetEl?.remove())
</script>

<style scoped>
.status-stage {
  position: relative;
  display: inline-flex;
}
.status-stage :deep(.ui-menu-panel) {
  border-radius: 14px;
}
.status-stage :deep(.ui-menu-body) {
  padding: 0.375rem;
}

.status-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  background: var(--ui-surface);
  color: var(--ui-text);
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
}
.status-dot {
  inline-size: 0.6rem;
  block-size: 0.6rem;
  border-radius: 50%;
  flex: none;
}

.status-stage :deep(.status-row) {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  inline-size: 100%;
  min-inline-size: 14rem;
  padding: 0.5rem 0.625rem;
  border: none;
  border-inline-start: 2px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--ui-text);
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease;
}
.status-stage :deep(.status-row:hover),
.status-stage :deep(.status-row:focus-visible) {
  background: var(--ui-muted);
  border-inline-start-color: var(--ui-primary);
  outline: none;
}
.status-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  line-height: 1.2;
}
.status-copy small {
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}
.status-check {
  flex: none;
  color: var(--ui-primary);
}
</style>
