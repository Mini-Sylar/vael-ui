<!-- Dialog with every part, open inside its own box: overlay, header (title and description), body, footer, maximize and close. -->
<template>
  <div data-specimen class="specimen">
    <!-- The dialog's container: its overlay, scroll lock and focus trap stay inside this box. -->
    <div ref="box" class="box">
      <div class="page">
        <strong>Team members</strong>
        <span v-for="name in members" :key="name">{{ name }}</span>
      </div>
      <Dialog
        v-model:open="open"
        :container="box"
        size="sm"
        maximizable
        title="Invite to team"
        description="They get access to every project."
      >
        <Input model-value="ada@lovelace.dev" aria-label="Email" />
        <template #footer>
          <Button variant="outline" size="sm">Cancel</Button>
          <Button size="sm">Send invite</Button>
        </template>
      </Dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Button, Dialog, Input } from 'vael-ui'

const box = useTemplateRef<HTMLElement>('box')
const open = shallowRef(true)
const members = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson']
</script>

<style scoped>
.specimen {
  inline-size: min(26rem, 100%);
}

.box {
  position: relative;
  overflow: hidden;
  block-size: 18rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  background: var(--ui-surface);
}

/* A page behind the overlay, so the dialog reads as on top of something. */
.page {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}

.page strong {
  color: var(--ui-text);
}
</style>
