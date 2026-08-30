<template>
  <section class="demo">
    <h3>Messages</h3>
    <ul class="swipe-list">
      <li v-for="message in messages" :key="message.id" class="swipe-row">
        <SwipeToReveal
          :ref="(el) => setRowRef(message.id, el)"
          v-model:open="openState[message.id]"
          @change="(open) => onRowChange(message.id, open)"
        >
          <template #actions="{ close }">
            <div class="swipe-actions">
              <Button variant="secondary" size="sm" @click="archive(message.id, close)">
                Archive
              </Button>
              <Button variant="danger" size="sm" @click="remove(message.id, close)">
                Delete
              </Button>
            </div>
          </template>

          <div class="swipe-content">
            <Avatar :name="message.from" size="sm" />
            <div class="swipe-body">
              <strong>{{ message.from }}</strong>
              <p class="note swipe-preview">{{ message.preview }}</p>
            </div>
            <Button
              v-if="message.showMenuButton"
              variant="ghost"
              size="sm"
              icon
              aria-label="More actions"
              @click.stop="setRowRef(message.id)?.reveal()"
            >
              <PhDotsThreeVertical :size="18" weight="bold" />
            </Button>
          </div>
        </SwipeToReveal>
      </li>
    </ul>
    <p class="note">
      Last change: <strong>{{ lastChange ?? 'none yet' }}</strong>
    </p>
  </section>
</template>

<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import { Avatar, Button, SwipeToReveal } from 'vael-ui'
import { PhDotsThreeVertical } from '@phosphor-icons/vue'

interface DemoMessage {
  id: string
  from: string
  preview: string
  showMenuButton?: boolean
}

const messages: DemoMessage[] = [
  { id: 'm1', from: 'Mira Mitchell', preview: 'Quarterly report is ready for review.' },
  { id: 'm2', from: "Marcus O'Connor", preview: 'Can we push the sync to 3pm?' },
  {
    id: 'm3',
    from: 'Elena Bennett',
    preview: 'No gesture needed here, try the ⋮ button instead.',
    showMenuButton: true,
  },
]

const openState = reactive<Record<string, boolean>>({})
const lastChange = shallowRef<string | null>(null)

type SwipeToRevealInstance = InstanceType<typeof SwipeToReveal>
const rowRefs: Record<string, SwipeToRevealInstance | null> = {}
function setRowRef(id: string, el?: unknown) {
  if (el !== undefined) rowRefs[id] = (el as SwipeToRevealInstance) ?? null
  return rowRefs[id]
}

function onRowChange(id: string, open: boolean) {
  lastChange.value = `${id} ${open ? 'opened' : 'closed'}`
}
function archive(id: string, close: () => void) {
  lastChange.value = `archived ${id}`
  close()
}
function remove(id: string, close: () => void) {
  lastChange.value = `deleted ${id}`
  close()
}
</script>

<style scoped>
.swipe-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-inline-size: 28rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  overflow: hidden;
}
.swipe-row + .swipe-row {
  border-block-start: 1px solid var(--ui-border);
}
.swipe-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--ui-surface);
}
.swipe-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-inline-size: 0;
  flex: 1;
}
.swipe-preview {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.swipe-actions {
  display: flex;
  align-items: stretch;
  gap: 1px;
  block-size: 100%;
  background: var(--ui-border);
}
.swipe-actions :deep(.ui-button) {
  border-radius: 0;
  inline-size: 5.5rem;
}
</style>
