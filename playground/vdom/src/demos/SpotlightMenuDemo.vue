<template>
  <section class="demo">
    <h2>Spotlight menu — extreme</h2>
    <p class="note">
      Still driven by plain <code>items</code> — the extreme layer bolts on through
      <code>force-mount</code> + <code>before-close(done)</code> and the exposed
      <code>panelEl</code>/<code>listEl</code>, the same recipe Bloom and Gooey use. motion-v
      springs the panel in from its real <code>transformOrigin</code>, staggers each row, and a
      "spotlight" pill tracks focus/hover between rows by reading their real <code>offsetTop</code>/
      <code>offsetHeight</code> on every <code>focusin</code> — nothing here required giving up the
      data-driven API.
    </p>
    <div ref="stageRef" class="spotlight-stage">
      <Menu
        v-if="teleportTarget"
        ref="menuRef"
        v-model:open="isOpen"
        force-mount
        :items="items"
        :teleport-to="teleportTarget"
        :before-close="beforeClose"
        @select="onSelect"
      >
        <template #trigger>
          <Button variant="secondary">
            <template #leading>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" />
                <path
                  d="M11 11l3.5 3.5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </template>
            Command menu
          </Button>
        </template>
      </Menu>
      <output class="panel-text">{{
        lastAction ? `Ran: ${lastAction}` : 'Nothing run yet'
      }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { animate } from 'motion-v'
import { Button, Menu } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'

const items: MenuEntry[] = [
  { label: 'New Document', value: 'new-doc', shortcut: '⌘N' },
  { label: 'New Folder', value: 'new-folder', shortcut: '⇧⌘N' },
  { label: 'Search', value: 'search', shortcut: '⌘F' },
  { type: 'separator' },
  { label: 'Settings', value: 'settings', shortcut: '⌘,' },
  { label: 'Delete', value: 'delete', danger: true, shortcut: '⌫' },
]

const lastAction = shallowRef('')
function onSelect(item: MenuItemData) {
  lastAction.value = item.label
}

const stageRef = useTemplateRef('stageRef')
const menuRef = useTemplateRef('menuRef')
const isOpen = shallowRef(false)

// Created imperatively, not authored in this component's own template — same
// reasoning as Bloom: Vue's Teleport can't reliably move content into a
// target its own vnode tree is simultaneously patching. Local (inside this
// component), not document.body, so scoped :deep() selectors below still
// reach the teleported panel — it never leaves this subtree.
const teleportTarget = shallowRef<HTMLElement | null>(null)
let teleportTargetEl: HTMLElement | null = null
onMounted(() => {
  teleportTargetEl = document.createElement('div')
  stageRef.value?.appendChild(teleportTargetEl)
  teleportTarget.value = teleportTargetEl
})
onUnmounted(() => teleportTargetEl?.remove())

interface SpringConfig {
  type: 'spring'
  visualDuration: number
  bounce: number
}
const PANEL_SPRING: SpringConfig = { type: 'spring', visualDuration: 0.32, bounce: 0.28 }
const ITEM_SPRING: SpringConfig = { type: 'spring', visualDuration: 0.28, bounce: 0.22 }
const SPOT_SPRING: SpringConfig = { type: 'spring', visualDuration: 0.35, bounce: 0.15 }
const EXIT_TWEEN = { duration: 0.15, ease: 'easeIn' as const }

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const nextFrame = () => new Promise(requestAnimationFrame)

let spotlightEl: HTMLElement | null = null
function ensureSpotlight(listEl: HTMLElement): HTMLElement {
  if (!spotlightEl || !listEl.contains(spotlightEl)) {
    spotlightEl = document.createElement('div')
    spotlightEl.className = 'spotlight-pill'
    listEl.prepend(spotlightEl)
  }
  return spotlightEl
}

// Read real DOM box, no model to keep in sync
function moveSpotlight(itemEl: HTMLElement) {
  const list = menuRef.value?.listEl
  if (!list) return
  const spot = ensureSpotlight(list)
  const top = itemEl.offsetTop - 5
  const height = itemEl.offsetHeight
  if (reducedMotion()) {
    spot.style.transform = `translateY(${top}px)`
    spot.style.height = `${height}px`
    spot.style.opacity = '1'
    return
  }
  animate(spot, { y: top, height, opacity: 1 }, SPOT_SPRING)
}

function onListFocusin(event: FocusEvent) {
  const itemEl = (event.target as HTMLElement | null)?.closest<HTMLElement>('[role="menuitem"]')
  if (itemEl) moveSpotlight(itemEl)
}
// Hover moves real focus; useMenu roving tabindex and spotlight share truth
function onListPointerOver(event: PointerEvent) {
  const itemEl = (event.target as HTMLElement | null)?.closest<HTMLElement>('[role="menuitem"]')
  if (itemEl && document.activeElement !== itemEl) itemEl.focus()
}

// Attach listeners before visibility wait to avoid racing focusFirst()
watch(isOpen, async (open) => {
  if (!open) return
  await nextTick()
  const list = menuRef.value?.listEl
  if (list) {
    list.addEventListener('focusin', onListFocusin)
    list.addEventListener('pointerover', onListPointerOver)
  }

  // Wait for positioner visibility (floating-ui positioning)
  const positioner = menuRef.value?.positionerEl
  for (let i = 0; i < 10 && positioner && positioner.style.visibility === 'hidden'; i++) {
    await nextFrame()
  }
  if (reducedMotion()) return

  const panel = menuRef.value?.panelEl
  if (panel) animate(panel, { opacity: [0, 1], scale: [0.92, 1] }, PANEL_SPRING)

  const rows = list ? Array.from(list.querySelectorAll<HTMLElement>('.ui-menu-item')) : []
  rows.forEach((row, i) => {
    animate(row, { opacity: [0, 1], y: [8, 0] }, { ...ITEM_SPRING, delay: i * 0.03 })
  })
})

function beforeClose(done: () => void) {
  const list = menuRef.value?.listEl
  list?.removeEventListener('focusin', onListFocusin)
  list?.removeEventListener('pointerover', onListPointerOver)
  const panel = menuRef.value?.panelEl
  if (!panel || reducedMotion()) {
    done()
    return
  }
  animate(panel, { opacity: 0, scale: 0.95 }, EXIT_TWEEN).finished.then(done)
}
</script>

<style scoped>
.spotlight-stage {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}
.spotlight-stage :deep(.ui-menu-body) {
  position: relative;
}
.spotlight-stage :deep(.spotlight-pill) {
  position: absolute;
  inset-inline: 0;
  border-radius: calc(var(--ui-radius) - 4px);
  background: var(--ui-muted);
  opacity: 0;
  pointer-events: none;
}
/* Items need stacking context to render above absolutely positioned pill */
.spotlight-stage :deep(.ui-menu-item) {
  position: relative;
}
/* Pill is the highlight; disable library hover/focus background */
.spotlight-stage :deep(.ui-menu-item:hover),
.spotlight-stage :deep(.ui-menu-item:focus-visible) {
  background: transparent;
  outline: none;
}
</style>
