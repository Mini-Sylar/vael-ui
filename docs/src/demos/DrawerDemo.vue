<template>
  <section class="demo">
    <h2>Drawer</h2>
    <p class="note">
      Same engine as <code>&lt;Dialog&gt;</code> (layer stack, focus trap, scroll lock,
      <code>force-mount</code>/<code>before-close</code> for custom motion), narrowed to a
      <code>side</code> prop that can only anchor to an edge. Reach for Dialog directly when you
      want a centered panel, and for <code>&lt;BottomSheet&gt;</code> when you want the bottom edge
      to also be drag-dismissible.
    </p>

    <h3>Navigation drawer: <code>side="left"</code> / <code>"right"</code></h3>
    <div class="row">
      <Button @click="navOpen = true">Open navigation</Button>
      <Button variant="outline" @click="cartOpen = true">Open cart</Button>
    </div>
    <Drawer v-model:open="navOpen" side="left" title="Menu" aria-label="Navigation">
      <MenuList :items="navItems" :active="activeNavItem" @select="onNavSelect" />
    </Drawer>
    <Drawer v-model:open="cartOpen" side="right" title="Your cart" aria-label="Cart">
      <div class="drawer-cart-list">
        <div v-for="item in cartItems" :key="item.name" class="drawer-cart-row">
          <span>{{ item.name }}</span>
          <span class="drawer-cart-price">{{ item.price }}</span>
        </div>
      </div>
      <template #footer="{ close }">
        <Button variant="ghost" @click="close()">Keep shopping</Button>
        <Button @click="close()">Checkout</Button>
      </template>
    </Drawer>

    <h3>Non-modal: <code>:modal="false"</code></h3>
    <p class="note">
      No overlay, no scroll lock, no stolen focus. The page behind stays fully interactive, try
      clicking the counter while the drawer is open. Escape still closes it.
    </p>
    <div class="row">
      <Button variant="outline" @click="pinnedOpen = !pinnedOpen">
        {{ pinnedOpen ? 'Close' : 'Open' }} filters
      </Button>
      <Button variant="secondary" @click="counter++">Clicked {{ counter }} times</Button>
    </div>
    <Drawer
      v-model:open="pinnedOpen"
      side="left"
      :modal="false"
      title="Filters"
      aria-label="Filters"
    >
      <p class="drawer-lede">Non-modal drawers are for persistent, page-adjacent panels.</p>
    </Drawer>

    <h3>Edge-to-edge: <code>side="top"</code> and <code>"bottom"</code></h3>
    <div class="row">
      <Button variant="outline" @click="topOpen = true">Open top</Button>
      <Button variant="outline" @click="bottomOpen = true">Open bottom</Button>
    </div>
    <Drawer
      v-model:open="topOpen"
      side="top"
      size="sm"
      title="New version available"
      aria-label="Announcement"
    >
      <p class="drawer-lede">
        A quick, dismissible strip anchored to the top edge instead of a corner toast.
      </p>
    </Drawer>
    <Drawer
      v-model:open="bottomOpen"
      side="bottom"
      size="sm"
      title="Cookie settings"
      aria-label="Cookie settings"
    >
      <p class="drawer-lede">
        No drag gesture here, just a plain slide. Use <code>&lt;BottomSheet&gt;</code> instead when
        the panel needs to be flicked away.
      </p>
    </Drawer>

    <h3><code>container</code>: scoped to a pane</h3>
    <p class="note">
      Forwarded straight to the underlying <code>Dialog</code>, same as everywhere else. The panel
      slides in from the pane's own edge instead of the viewport's, and only the pane is blocked,
      the rest of the page stays interactive.
    </p>
    <div ref="drawerPane" class="drawer-pane">
      <p class="note" style="margin: 0">A pane with its own content.</p>
      <Button size="sm" variant="outline" @click="containedOpen = true">Open, contained</Button>
    </div>
    <Drawer
      v-model:open="containedOpen"
      :container="drawerPane"
      side="right"
      size="sm"
      title="Filters"
      aria-label="Filters"
    >
      <p class="drawer-lede">Scrolling the page and clicking outside the pane both still work.</p>
    </Drawer>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Button, Drawer, MenuList } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'

const navOpen = shallowRef(false)
const cartOpen = shallowRef(false)
const pinnedOpen = shallowRef(false)
const topOpen = shallowRef(false)
const bottomOpen = shallowRef(false)
const containedOpen = shallowRef(false)
const drawerPane = useTemplateRef('drawerPane')
const counter = shallowRef(0)

const activeNavItem = shallowRef('overview')
const navItems: MenuEntry[] = [
  { label: 'Overview', value: 'overview' },
  { label: 'Projects', value: 'projects' },
  { label: 'Settings', value: 'settings' },
]
function onNavSelect(item: MenuItemData) {
  if (item.value) activeNavItem.value = String(item.value)
  navOpen.value = false
}

const cartItems = [
  { name: 'Desk lamp', price: '$34.00' },
  { name: 'Notebook, ruled', price: '$6.00' },
  { name: 'Ceramic mug', price: '$12.00' },
]
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.drawer-lede {
  margin: 0;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}
.drawer-cart-list {
  display: grid;
  gap: 0.5rem;
}
.drawer-cart-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}
.drawer-cart-price {
  color: var(--ui-text-muted);
}
.drawer-pane {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  block-size: 16rem;
  max-inline-size: 28rem;
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
</style>
