<template>
  <section class="demo">
    <h2>CommandPalette</h2>
    <p class="note">
      Composes <code>Dialog</code> internally instead of reimplementing a host (the same pattern
      <code>ContextMenu</code> uses over <code>Menu</code>), so it inherits the exact same
      animation-agnostic contract: <code>force-mount</code>, <code>before-close(done)</code>, and an
      exposed <code>panelEl</code>.
    </p>

    <h3>Default (CSS transition, shortcut, icons)</h3>
    <p class="note">
      Press <Kbd>{{ modKeyLabel }}</Kbd
      >+<Kbd>K</Kbd> anywhere on this page, or click the button. <code>shortcut</code> is opt-in —
      nothing listens until you set it.
    </p>
    <div class="row">
      <Button @click="basicOpen = true">Open command palette</Button>
      <span v-if="lastSelected" class="note"
        >Last selected: <code>{{ lastSelected }}</code></span
      >
    </div>
    <CommandPalette
      v-model:open="basicOpen"
      shortcut="mod+k"
      :items="commands"
      @select="(item) => (lastSelected = item.label)"
    />

    <h3>Icons, shortcut hints, and groups</h3>
    <p class="note">
      <code>icon</code>, <code>shortcut</code>, and <code>group</code> are all optional per item.
      <code>shortcut</code> is display-only — a <code>Kbd</code> hint, not a functioning key binding
      — items sharing a <code>group</code> cluster under a sticky heading in first-seen order, even
      when they aren't adjacent in the array.
    </p>
    <div class="row">
      <Button variant="outline" @click="groupedOpen = true">Open grouped palette</Button>
    </div>
    <CommandPalette v-model:open="groupedOpen" :items="groupedCommands" />

    <h3><code>position</code></h3>
    <p class="note">
      Forwarded straight to the underlying <code>Dialog</code>. Default <code>top</code> matches the
      Spotlight/Raycast convention; <code>center</code> reads more like a regular modal.
    </p>
    <div class="row">
      <Button variant="outline" @click="centerOpen = true">Open, position="center"</Button>
    </div>
    <CommandPalette v-model:open="centerOpen" position="center" :items="commands" />

    <h3>Custom exit: GSAP shared-element FLIP</h3>
    <p class="note">
      Grows out of the button's real <code>getBoundingClientRect()</code> position and size (iOS
      app-icon style) instead of scaling from the viewport — the same FLIP technique
      <code>Dialog</code>'s own demo uses, driven off <code>panelEl</code> here instead.
    </p>
    <div class="row">
      <Button ref="gsapTrigger" variant="secondary" @click="gsapEnter"
        >Grow from here (GSAP)</Button
      >
    </div>
    <CommandPalette
      ref="gsapPalette"
      v-model:open="gsapOpen"
      force-mount
      :before-close="gsapBeforeClose"
      :items="commands"
      @select="(item) => (lastSelected = item.label)"
    />

    <h3>Custom exit: motion-v spring + staggered rows</h3>
    <p class="note">
      The panel springs in with real overshoot (<code>bounce: 0.35</code>), then each row cascades
      in individually with a 40ms stagger — a class of choreography a single CSS
      <code>transition</code> on the panel alone can't express.
    </p>
    <div class="row">
      <Button variant="secondary" @click="motionEnter">Open (motion-v)</Button>
    </div>
    <CommandPalette
      ref="motionPalette"
      v-model:open="motionOpen"
      force-mount
      :before-close="motionBeforeClose"
      :items="commands"
      @select="(item) => (lastSelected = item.label)"
    />
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { useAnimate } from 'motion-v'
import { Button, CommandPalette, Kbd } from 'vael-ui'
import type { CommandPaletteItem } from 'vael-ui'
import {
  PhArchive,
  PhFileArrowDown,
  PhFilePlus,
  PhFolderPlus,
  PhGear,
  PhUserPlus,
} from '@phosphor-icons/vue'

const modKeyLabel =
  typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl'

const commands: CommandPaletteItem[] = [
  {
    id: 'new-file',
    label: 'New File',
    description: 'Create a blank document',
    keywords: ['create'],
    icon: PhFilePlus,
  },
  { id: 'new-folder', label: 'New Folder', description: 'Group related files', icon: PhFolderPlus },
  {
    id: 'open-settings',
    label: 'Open Settings',
    description: 'Preferences and theme',
    icon: PhGear,
  },
  { id: 'invite', label: 'Invite Teammate', description: 'Share this workspace', icon: PhUserPlus },
  {
    id: 'export',
    label: 'Export as PDF',
    description: 'Download the current document',
    icon: PhFileArrowDown,
  },
  {
    id: 'archived',
    label: 'Archived Item',
    description: 'Not selectable',
    disabled: true,
    icon: PhArchive,
  },
]

const groupedCommands: CommandPaletteItem[] = [
  {
    id: 'g-new-file',
    label: 'New File',
    icon: PhFilePlus,
    shortcut: [modKeyLabel, 'N'],
    group: 'File',
  },
  {
    id: 'g-new-folder',
    label: 'New Folder',
    icon: PhFolderPlus,
    shortcut: [modKeyLabel, 'Shift', 'N'],
    group: 'File',
  },
  {
    id: 'g-export',
    label: 'Export as PDF',
    icon: PhFileArrowDown,
    shortcut: [modKeyLabel, 'E'],
    group: 'File',
  },
  {
    id: 'g-invite',
    label: 'Invite Teammate',
    icon: PhUserPlus,
    shortcut: [modKeyLabel, 'I'],
    group: 'Workspace',
  },
  {
    id: 'g-settings',
    label: 'Open Settings',
    icon: PhGear,
    shortcut: [modKeyLabel, ','],
    group: 'Workspace',
  },
]

const lastSelected = shallowRef<string | null>(null)

const basicOpen = shallowRef(false)
const groupedOpen = shallowRef(false)
const centerOpen = shallowRef(false)

function flipDelta(triggerEl: HTMLElement | null, panel: HTMLElement | null) {
  if (!triggerEl || !panel) return null
  const t = triggerEl.getBoundingClientRect()
  const p = panel.getBoundingClientRect()
  return {
    panel,
    x: t.left + t.width / 2 - (p.left + p.width / 2),
    y: t.top + t.height / 2 - (p.top + p.height / 2),
    scaleX: t.width / p.width,
    scaleY: t.height / p.height,
  }
}

const gsapOpen = shallowRef(false)
const gsapPalette = useTemplateRef('gsapPalette')
const gsapTrigger = useTemplateRef('gsapTrigger')

function gsapEnter() {
  gsapOpen.value = true
  requestAnimationFrame(() => {
    const triggerEl = (gsapTrigger.value as { el?: HTMLElement } | null)?.el ?? null
    const delta = flipDelta(triggerEl, gsapPalette.value?.panelEl ?? null)
    if (!delta) return
    gsap.fromTo(
      delta.panel,
      { x: delta.x, y: delta.y, scaleX: delta.scaleX, scaleY: delta.scaleY, opacity: 0.4 },
      {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        duration: 0.45,
        ease: 'power3.out',
        onComplete: () => gsap.set(delta.panel, { clearProps: 'transform,opacity' }),
      },
    )
  })
}
function gsapBeforeClose(done: () => void) {
  const triggerEl = (gsapTrigger.value as { el?: HTMLElement } | null)?.el ?? null
  const delta = flipDelta(triggerEl, gsapPalette.value?.panelEl ?? null)
  if (!delta) return done()
  gsap.to(delta.panel, {
    x: delta.x,
    y: delta.y,
    scaleX: delta.scaleX,
    scaleY: delta.scaleY,
    opacity: 0.4,
    duration: 0.3,
    ease: 'power3.in',
    onComplete: () => {
      done()
      requestAnimationFrame(() => gsap.set(delta.panel, { clearProps: 'transform,opacity' }))
    },
  })
}

const motionOpen = shallowRef(false)
const motionPalette = useTemplateRef('motionPalette')
const [, animateMotion] = useAnimate()

function motionEnter() {
  motionOpen.value = true
  requestAnimationFrame(() => {
    const panel = motionPalette.value?.panelEl
    if (!panel) return
    animateMotion(
      panel,
      { opacity: [0, 1], scale: [0.9, 1], y: [24, 0] },
      { type: 'spring', bounce: 0.35, duration: 0.5 },
    )
    panel.querySelectorAll<HTMLElement>('.ui-command-palette-item').forEach((item, i) => {
      animateMotion(
        item,
        { opacity: [0, 1], y: [8, 0] },
        { duration: 0.25, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] },
      )
    })
  })
}
async function motionBeforeClose(done: () => void) {
  const panel = motionPalette.value?.panelEl
  if (!panel) return done()
  const controls = animateMotion(
    panel,
    { opacity: 0, scale: 0.92, y: 12 },
    { duration: 0.15, ease: [0.4, 0, 1, 1] },
  )
  await controls.finished
  done()
}
</script>
