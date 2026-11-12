<template>
  <section class="demo">
    <h3>A count after each label</h3>
    <p class="note">
      <code>#label</code> replaces the text of a row and keeps its icon. The current page's
      indicator and the hover highlight stay as they are.
    </p>
    <MenuList :items="items" active="inbox" class="list" aria-label="Mailboxes">
      <template #label="{ item }">
        {{ item.label }}
        <Badge v-if="item.count" variant="muted" :count="item.count" />
      </template>
    </MenuList>
  </section>
</template>

<script setup lang="ts">
import { PhArchive, PhPaperPlaneTilt, PhTray } from '@phosphor-icons/vue'
import { Badge, MenuList } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'

type Row = MenuItemData & { count?: number }

const items: MenuEntry<Row>[] = [
  { label: 'Inbox', value: 'inbox', icon: PhTray, count: 12 },
  { label: 'Sent', value: 'sent', icon: PhPaperPlaneTilt },
  { label: 'Archive', value: 'archive', icon: PhArchive, count: 340 },
]
</script>

<style scoped>
.list {
  max-inline-size: 16rem;
}
</style>
