<template>
  <section class="demo">
    <h2>Menu</h2>
    <p class="note">
      Data-driven: pass <code>items</code>, drop a button in <code>#trigger</code>, done — Menu owns
      the open toggle and ships styled rows (icon / label / shortcut / danger / separator) with no
      markup or CSS required. Under the hood it's <code>usePopover</code> (position + lifecycle,
      reused verbatim) plus <code>useMenu</code> (roving focus, typeahead, activation). Try it with
      a keyboard: open, then ↑/↓, Home/End, or just type a letter. Since <code>items</code> is just
      a <code>computed()</code>, rows react to your own state for free — no library API for it,
      "Archive" below only unlocks once "Favorite" is on.
    </p>

    <h3>Actions menu — disabled + keep-open + danger rows</h3>
    <div class="row">
      <Menu :items="actionItems" @select="onSelect">
        <template #trigger>
          <Button>Actions</Button>
        </template>
      </Menu>
      <output class="panel-text">
        {{ lastAction ? `Last action: ${lastAction}` : 'No action yet' }}
      </output>
    </div>

    <h3>Controlled + custom rows via the <code>#item</code> slot</h3>
    <p class="note">
      <code>v-model:open</code> is optional — bind it only to drive the menu from outside (here a
      second button toggles it). The <code>#item</code> slot overrides a row's content while keeping
      its behavior — this one renders a color swatch beside each label.
    </p>
    <div class="row">
      <Menu v-model:open="paletteOpen" :items="paletteItems" @select="pickColor">
        <template #trigger>
          <Button variant="outline">
            <span class="swatch" :style="{ background: color }" />
            {{ color }}
          </Button>
        </template>
        <template #item="{ item }">
          <span class="swatch" :style="{ background: item.value }" />
          {{ item.label }}
        </template>
      </Menu>
      <Button size="sm" variant="ghost" @click="paletteOpen = !paletteOpen">
        Toggle from outside
      </Button>
    </div>

    <h3>Submenus — recursive, no separate component</h3>
    <p class="note">
      Nest another <code>items</code> array on an entry and it becomes a submenu trigger — a submenu
      is just another Menu instance, one level deeper, reusing everything (positioning, roving
      focus, typeahead). Opens on hover-intent, click, Enter/Space, or ArrowRight; ArrowLeft (or
      moving the pointer away) closes it and returns focus to the parent row. Selecting a leaf
      action closes the whole chain, not just the submenu — try "Copy Link".
    </p>
    <div class="row">
      <Menu :items="fileItems" @select="onSelect">
        <template #trigger>
          <Button variant="secondary">File</Button>
        </template>
      </Menu>
    </div>

    <h3>Side / align — same floating-ui middleware as Popover</h3>
    <p class="note">
      <code>align</code> defaults to <code>start</code> here (not Popover's <code>center</code>) — a
      menu hangs off its trigger's edge, the way a native dropdown does.
    </p>
    <div class="row">
      <Menu
        v-for="config in sideAlignConfigs"
        :key="`${config.side}-${config.align}`"
        :items="simpleItems"
        :side="config.side"
        :align="config.align"
        @select="onSelect"
      >
        <template #trigger>
          <Button size="sm" variant="secondary">{{ config.side }}/{{ config.align }}</Button>
        </template>
      </Menu>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Button, Menu } from 'vael-ui'
import type { MenuAlign, MenuEntry, MenuItemData, MenuSide } from 'vael-ui'

const lastAction = shallowRef('')
function onSelect(item: MenuItemData) {
  lastAction.value = item.label
}

const favorited = shallowRef(false)
const actionItems = computed<MenuEntry[]>(() => [
  { label: 'Rename', value: 'rename', shortcut: '⌘R' },
  { label: 'Duplicate', value: 'duplicate', shortcut: '⌘D' },
  {
    label: favorited.value ? '★ Favorited' : '☆ Favorite',
    value: 'favorite',
    keepOpen: true,
    onSelect: () => (favorited.value = !favorited.value),
  },
  { type: 'separator' },
  // Conditional via plain reactivity; computed() reruns when favorited changes
  { label: 'Archive', value: 'archive', disabled: !favorited.value },
  { label: 'Delete', value: 'delete', danger: true },
])

const fileItems: MenuEntry[] = [
  { label: 'New Tab', value: 'new-tab', shortcut: '⌘T' },
  { label: 'New Window', value: 'new-window', shortcut: '⇧⌘N' },
  { type: 'separator' },
  {
    label: 'Share',
    items: [
      { label: 'Copy Link', value: 'copy-link' },
      { label: 'Email', value: 'email' },
      // Submenus recurse: four levels deep to prove it works
      {
        label: 'Social',
        items: [
          {
            label: 'Twitter',
            items: [
              { label: 'Post', value: 'twitter-post' },
              { label: 'DM', value: 'twitter-dm' },
            ],
          },
          { label: 'Mastodon', value: 'mastodon' },
        ],
      },
    ],
  },
  { type: 'separator' },
  { label: 'Print…', value: 'print', shortcut: '⌘P' },
]

const simpleItems: MenuEntry[] = [
  { label: 'One', value: 'one' },
  { label: 'Two', value: 'two' },
  { label: 'Three', value: 'three' },
]

const paletteOpen = shallowRef(false)
const color = shallowRef('#6366f1')
const paletteItems: MenuEntry[] = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Rose', value: '#f43f5e' },
]
function pickColor(item: MenuItemData) {
  if (item.value) color.value = item.value
}

const sideAlignConfigs: { side: MenuSide; align: MenuAlign }[] = [
  { side: 'top', align: 'start' },
  { side: 'bottom', align: 'center' },
  { side: 'right', align: 'end' },
  { side: 'left', align: 'center' },
]
</script>

<style scoped>
.swatch {
  display: inline-block;
  inline-size: 0.85em;
  block-size: 0.85em;
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 15%);
}
</style>
