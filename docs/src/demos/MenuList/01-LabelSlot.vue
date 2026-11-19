<template>
  <section class="demo">
    <h3>A count at the end of each row</h3>
    <p class="note">
      <code>#label</code> replaces the text of a row and keeps its icon. Anything after the text
      goes to the row's far end, and the current page's indicator and the hover highlight stay as
      they are. A <code>disabled</code> row stays dim, badge included, and is skipped by the arrow
      keys.
    </p>
    <div class="pair">
      <MenuList :items="mailboxes" active="inbox" class="list" aria-label="Mailboxes">
        <template #label="{ item }">
          {{ item.label }}
          <Badge v-if="item.count" variant="muted" :count="item.count" />
        </template>
      </MenuList>

      <MenuList :items="tools" class="list" aria-label="Workspace">
        <template #label="{ item }">
          {{ item.label }}
          <Badge v-if="item.tag" :variant="item.tag.variant">{{ item.tag.text }}</Badge>
        </template>
      </MenuList>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  PhArchive,
  PhChartBar,
  PhFlask,
  PhGear,
  PhPaperPlaneTilt,
  PhPlugs,
  PhTray,
  PhTrash,
  PhUsers,
} from '@phosphor-icons/vue'
import { Badge, MenuList } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'

type Mailbox = MenuItemData & { count?: number }
type Tool = MenuItemData & { tag?: { text: string; variant: 'primary' | 'warning' | 'info' } }

const mailboxes: MenuEntry<Mailbox>[] = [
  { label: 'Inbox', value: 'inbox', icon: PhTray, count: 12 },
  { label: 'Sent', value: 'sent', icon: PhPaperPlaneTilt },
  { label: 'Archive', value: 'archive', icon: PhArchive, count: 340 },
  { type: 'separator' },
  { label: 'Trash', value: 'trash', icon: PhTrash, count: 3, disabled: true },
]

const tools: MenuEntry<Tool>[] = [
  {
    label: 'Reports',
    value: 'reports',
    icon: PhChartBar,
    tag: { text: 'New', variant: 'primary' },
  },
  { label: 'Team', value: 'team', icon: PhUsers },
  { label: 'Labs', value: 'labs', icon: PhFlask, tag: { text: 'Beta', variant: 'info' } },
  {
    label: 'Integrations',
    value: 'integrations',
    icon: PhPlugs,
    tag: { text: 'Soon', variant: 'warning' },
    disabled: true,
  },
  { type: 'separator' },
  { label: 'Settings', value: 'settings', icon: PhGear, shortcut: '⌘,' },
]
</script>

<style scoped>
.pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem;
}
.list {
  max-inline-size: 16rem;
}
</style>
