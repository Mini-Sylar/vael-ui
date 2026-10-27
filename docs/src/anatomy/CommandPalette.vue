<!-- CommandPalette with every part, open inside its own boxes: one with grouped results and a footer, one with no results. -->
<template>
  <div data-specimen class="specimen">
    <!-- Each palette's container: its overlay, scroll lock and focus trap stay inside the box. -->
    <div ref="results" class="box box--results">
      <CommandPalette
        v-model:open="open"
        :container="results"
        :items="items"
        placeholder="Search commands"
        size="sm"
      >
        <template #footer>
          <span class="hint"><Kbd>↑</Kbd><Kbd>↓</Kbd> to move</span>
          <span class="hint"><Kbd>↵</Kbd> to run</span>
        </template>
      </CommandPalette>
    </div>
    <!-- The empty part shows only when nothing matches, so a second palette searches for nothing. -->
    <div ref="noResults" class="box box--empty">
      <CommandPalette
        v-model:open="openEmpty"
        v-model:query="query"
        :container="noResults"
        :items="items"
        :modal="false"
        size="sm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, shallowRef, useTemplateRef } from 'vue'
import { CommandPalette, Kbd } from 'vael-ui'
import { PhCreditCard, PhUserPlus } from '@phosphor-icons/vue'

const results = useTemplateRef<HTMLElement>('results')
const noResults = useTemplateRef<HTMLElement>('noResults')
const open = shallowRef(true)
const openEmpty = shallowRef(true)
const query = shallowRef('')
// Set once open: the palette clears its query when it opens.
onMounted(() => setTimeout(() => (query.value = 'Invoices 2019'), 50))

const items = [
  {
    id: 'invite',
    label: 'Invite Ada Lovelace',
    icon: PhUserPlus,
    shortcut: ['⌘', 'I'],
    group: 'Suggestions',
  },
  { id: 'billing', label: 'Billing email', icon: PhCreditCard, group: 'Settings' },
]
</script>

<style scoped>
.specimen {
  display: grid;
  gap: 0.75rem;
  inline-size: min(26rem, 100%);
}

.box {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  background: var(--ui-surface);
}

.box--results {
  block-size: 18rem;
}

.box--empty {
  block-size: 12rem;
}

.hint {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
</style>
