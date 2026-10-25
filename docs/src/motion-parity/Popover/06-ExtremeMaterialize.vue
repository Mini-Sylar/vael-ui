<template>
  <section class="demo">
    <h3>Extreme: a panel that materializes out of its trigger</h3>
    <p class="note">
      The panel's <code>motion</code> gives it an <code>initial</code> and an <code>exit</code>. It
      grows out of the trigger's center, coming into focus on a soft spring, and fades back faster
      than it came. Click the trigger mid-exit and it turns around from where it is.
    </p>
    <Popover v-model:open="open" side="bottom" align="start" :motion="materialize">
      <template #trigger="{ setTriggerEl }">
        <Button :ref="setTriggerEl" variant="secondary" @click="open = !open">Ada Lovelace</Button>
      </template>
      <template #default="{ close }">
        <div class="card">
          <div class="card-head">
            <Avatar name="Ada Lovelace" />
            <div>
              <p class="card-name">Ada Lovelace</p>
              <p class="card-meta">Analytical Engine team</p>
            </div>
          </div>
          <p class="card-text">Wrote the first published program, for a machine not yet built.</p>
          <div class="card-actions">
            <Button size="sm" variant="outline" @click="close">Dismiss</Button>
            <Button size="sm" @click="close">Follow</Button>
          </div>
        </div>
      </template>
    </Popover>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Avatar, Button, Popover } from 'vael-ui'
import type { PopoverMotion } from 'vael-ui'

const open = shallowRef(false)

const out = { duration: 150, easing: 'out' }

// Opacity and blur ease in over 200 ms; scale rides a soft spring. Out: 150 ms, eased.
const materialize: PopoverMotion = {
  duration: 200,
  easing: 'out',
  initial: {
    panel: {
      opacity: 0,
      blur: 6,
      scale: { value: 0.9, spring: { damping: 0.85, response: 0.26 } },
    },
  },
  exit: {
    panel: {
      opacity: { value: 0, ...out },
      scale: { value: 0.96, ...out },
      blur: { value: 2, ...out },
    },
  },
}
</script>

<style scoped>
.card {
  inline-size: 16rem;
  display: grid;
  gap: 0.75rem;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.card-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.card-meta,
.card-text {
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
