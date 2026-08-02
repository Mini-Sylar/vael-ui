<template>
  <section class="demo">
    <Popover v-model:open="open" side="bottom" align="start">
      <template #trigger="{ setTriggerEl }">
        <Button :ref="setTriggerEl" variant="danger" @click="open = true">
          <template #leading>
            <PhTrash weight="bold" />
          </template>
          Delete item
        </Button>
      </template>
      <div class="confirm-popover">
        <p class="confirm-title">Delete this item?</p>
        <p class="confirm-description">This can't be undone.</p>
        <p v-if="error" class="confirm-error">Delete failed. Try again.</p>
        <div class="confirm-actions">
          <Button size="sm" variant="outline" @click="cancel">Cancel</Button>
          <Button
            size="sm"
            variant="danger"
            :disabled="pending"
            @click="confirm(() => fakeDelete())"
          >
            {{ pending ? 'Deleting…' : 'Delete' }}
          </Button>
        </div>
      </div>
    </Popover>
    <p class="demo-status">
      Status: <strong>{{ status }}</strong>
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Button, Popover, useConfirmAction } from 'vael-ui'
import { PhTrash } from '@phosphor-icons/vue'

const { open, pending, error, confirm, cancel } = useConfirmAction()

const deleteCount = shallowRef(0)
const lastOutcome = shallowRef<'idle' | 'deleted' | 'cancelled'>('idle')

// A real request most of the time; fails on every 3rd click so the error
// path (dialog stays open, message shows) is easy to see without editing code.
function fakeDelete(): Promise<void> {
  deleteCount.value++
  const shouldFail = deleteCount.value % 3 === 0
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) reject(new Error('network error'))
      else {
        lastOutcome.value = 'deleted'
        resolve()
      }
    }, 900)
  })
}

const status = computed(() => {
  if (pending.value) return 'deleting…'
  if (lastOutcome.value === 'deleted') return 'deleted'
  return 'idle'
})
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.confirm-popover {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  inline-size: 19rem;
}

.confirm-title {
  font-weight: 600;
  margin: 0;
}

.confirm-description {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  margin: 0;
}

.confirm-error {
  color: var(--ui-danger);
  font-size: 0.8125rem;
  margin: 0;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.demo-status {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
</style>
