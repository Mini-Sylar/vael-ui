<template>
  <section class="demo">
    <h3>Extreme: a panel that materializes out of its trigger</h3>
    <p class="note">
      <code>morph: 'trigger'</code> grows the panel out of the button and folds it back in. Its
      three blocks are targets: they rise into focus one after another once the panel is mostly
      there. Click the trigger mid-exit and it turns around from where it is.
    </p>
    <Popover v-model:open="open" side="bottom" align="start" :motion="materialize">
      <template #trigger="{ setTriggerEl }">
        <Button :ref="setTriggerEl" variant="secondary" @click="open = !open">Ada Lovelace</Button>
      </template>
      <template #default="{ close }">
        <div class="card">
          <div v-animate:row class="card-head">
            <Avatar name="Ada Lovelace" />
            <div>
              <p class="card-name">Ada Lovelace</p>
              <p class="card-meta">Analytical Engine team</p>
            </div>
          </div>
          <p v-animate:row class="card-text">
            Wrote the first published program, for a machine not yet built.
          </p>
          <div v-animate:row class="card-actions">
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
import { Avatar, Button, Popover, vAnimate } from 'vael-ui'
import type { PopoverMotion } from 'vael-ui'

const open = shallowRef(false)

// The panel grows from the trigger; the rows follow it in, softly, and fold away with it.
const materialize: PopoverMotion<'row'> = {
  morph: 'trigger',
  spring: { damping: 0.8, response: 0.4 },
  targets: {
    row: { initial: { opacity: 0, y: 8, blur: 4 }, stagger: 0.05, after: 'panel:60%' },
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
