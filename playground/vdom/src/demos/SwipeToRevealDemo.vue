<template>
  <section class="demo">
    <h2>SwipeToReveal</h2>
    <p class="note">
      An iOS-style list row — drag left to reveal Archive/Delete, release to commit (a fast flick
      commits regardless of distance; a slow drag needs to cross the midpoint). The actions stay in
      the DOM and Tab-reachable even while closed — try Tab-ing through the list below with the
      mouse untouched, or use the <code>…</code> button on the last row, which calls
      <code>reveal()</code>
      programmatically with no gesture at all.
    </p>

    <h3>Messages</h3>
    <ul class="swipe-list">
      <li v-for="message in messages" :key="message.id" class="swipe-row">
        <SwipeToReveal
          :ref="(el) => setRowRef(message.id, el)"
          v-model:open="openState[message.id]"
          @change="(open) => onRowChange(message.id, open)"
        >
          <template #actions="{ close }">
            <button
              type="button"
              class="swipe-action swipe-action--archive"
              @click="archive(message.id, close)"
            >
              Archive
            </button>
            <button
              type="button"
              class="swipe-action swipe-action--delete"
              @click="remove(message.id, close)"
            >
              Delete
            </button>
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

    <h3>Reveal from the leading edge — <code>side="leading"</code></h3>
    <ul class="swipe-list">
      <li class="swipe-row">
        <SwipeToReveal side="leading">
          <template #actions>
            <button type="button" class="swipe-action swipe-action--read">Mark read</button>
          </template>
          <div class="swipe-content">
            <Avatar name="Priya Nair" size="sm" />
            <div class="swipe-body">
              <strong>Priya Nair</strong>
              <p class="note swipe-preview">
                Drag right instead — actions live behind the left edge.
              </p>
            </div>
          </div>
        </SwipeToReveal>
      </li>
    </ul>
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
  { id: 'm1', from: 'Ama Mensah', preview: 'Quarterly report is ready for review.' },
  { id: 'm2', from: 'Kwame Owusu', preview: 'Can we push the sync to 3pm?' },
  {
    id: 'm3',
    from: 'Efua Boateng',
    preview: 'No gesture needed here — try the ⋮ button instead.',
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
  border-radius: var(--ui-radius);
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
.swipe-action {
  display: grid;
  place-items: center;
  inline-size: 5rem;
  border: none;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
}
.swipe-action--archive {
  background: var(--ui-info, #2563eb);
}
.swipe-action--delete {
  background: var(--ui-danger);
}
.swipe-action--read {
  background: var(--ui-primary);
  inline-size: 6rem;
}
</style>
