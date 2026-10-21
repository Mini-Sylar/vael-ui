<template>
  <section class="demo">
    <h3>Turning the glide off</h3>
    <p class="note">
      Every list in vael-ui glides its hover highlight. Switch it off here to compare. In your app:
    </p>
    <ul class="off-ways">
      <li>
        <strong>Just the glide:</strong> set <code>--ui-duration-indicator: 0ms</code> and
        <code>--ui-duration-indicator-wide: 0ms</code> on <code>:root</code>, or on any element to
        scope it. The highlight still shows; it moves at once. This switch does exactly that.
      </li>
      <li>
        <strong>All motion:</strong> <code>&lt;ConfigProvider :motion-css="false"&gt;</code> zeroes
        every vael-ui duration, the glide included.
      </li>
      <li>
        <strong>One component:</strong> <code>motion-css="false"</code> on Select, Combobox,
        CommandPalette, Tree, Pagination, DataTable or Calendar. Its highlight moves at once, and
        its exposed indicator element is yours to animate.
      </li>
      <li><strong>The highlight itself:</strong> <code>--ui-indicator-bg: transparent</code>.</li>
    </ul>
    <div class="row">
      <Switch v-model="glide" label="Glide" />
    </div>
    <div class="off-frame" :style="glide ? undefined : instant">
      <MenuList :items="items" active="inbox" aria-label="Mailboxes" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { MenuList, Switch } from 'vael-ui'

const glide = shallowRef(true)
const instant = { '--ui-duration-indicator': '0ms', '--ui-duration-indicator-wide': '0ms' }

const items = [
  { label: 'Inbox', value: 'inbox' },
  { label: 'Starred', value: 'starred' },
  { label: 'Sent', value: 'sent' },
  { label: 'Drafts', value: 'drafts' },
  { label: 'Archive', value: 'archive' },
]
</script>

<style scoped>
.off-ways {
  display: grid;
  gap: 0.375rem;
  margin: 0 0 1rem;
  padding-inline-start: 1.25rem;
  font-size: 0.875rem;
}
.row {
  margin-block-end: 0.75rem;
}
.off-frame {
  max-inline-size: 16rem;
  padding: 0.375rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
</style>
