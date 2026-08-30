<template>
  <section class="demo">
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
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Drawer, MenuList } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'

const navOpen = shallowRef(false)
const cartOpen = shallowRef(false)

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
</style>
