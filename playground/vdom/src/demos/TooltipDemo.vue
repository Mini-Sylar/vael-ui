<template>
  <section class="demo">
    <h2>Tooltip</h2>
    <p class="note">
      Two APIs over one core. <code>v-tooltip</code> + a single
      <code>&lt;TooltipHost /&gt;</code> is the 90% case: the directive stores a string per element,
      the host serves every target with one floating element and two document-level listeners —
      per-target cost stays ~zero at any scale. <code>&lt;Tooltip&gt;</code> is the rich-content
      path with the full animation contract (<code>force-mount</code>, <code>beforeClose</code>,
      exposed <code>panelEl</code>, <code>data-state</code>). Both share one warm group: the first
      tooltip waits, then sweeping along the toolbar shows each next one instantly with no
      animation.
    </p>

    <h3>Toolbar — v-tooltip directive, shared warm group</h3>
    <div class="row">
      <Button
        v-for="item in toolbar"
        :key="item.label"
        v-tooltip="item.label"
        icon
        variant="outline"
        :aria-label="item.label"
      >
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
          <path
            :d="item.d"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </Button>
    </div>

    <h3>Sides — modifier syntax</h3>
    <div class="row">
      <Button v-tooltip.top="'side top'" size="sm" variant="secondary">top</Button>
      <Button v-tooltip.bottom="'side bottom'" size="sm" variant="secondary">bottom</Button>
      <Button v-tooltip.left="'side left'" size="sm" variant="secondary">left</Button>
      <Button v-tooltip.right="'side right'" size="sm" variant="secondary">right</Button>
    </div>

    <h3>Rich content — the component path</h3>
    <div class="row">
      <Tooltip :open-delay="300">
        <template #trigger="{ setTriggerEl }">
          <Button :ref="setTriggerEl" variant="outline">Rich tooltip</Button>
        </template>
        <div class="rich-tip">
          <strong>Publish document</strong>
          <span>Makes this draft visible to everyone in the workspace.</span>
          <span class="rich-tip-kbd"><kbd>⌘</kbd><kbd>⇧</kbd><kbd>P</kbd></span>
        </div>
      </Tooltip>

      <Tooltip :open-delay="300">
        <template #trigger="{ setTriggerEl }">
          <Button :ref="setTriggerEl" variant="outline">Interactive</Button>
        </template>
        <span data-allow-select>
          You can move onto me and select this text —
          <a href="#" @click.prevent>or click this</a>.
        </span>
      </Tooltip>
    </div>

    <p class="note">
      EXTREME example: <code>force-mount</code> + <code>beforeClose(done)</code> + the exposed
      <code>panelEl</code> — motion-v owns entrance and exit entirely, same escape hatch as Popover
      and Dialog.
    </p>
    <div class="row">
      <Tooltip
        ref="motionTip"
        v-model:open="motionOpen"
        force-mount
        :open-delay="200"
        :trigger-el="motionTriggerRef"
        :before-close="motionBeforeClose"
      >
        <span>Sprung by motion-v.</span>
      </Tooltip>
      <Button ref="motionTriggerRef" variant="secondary">motion-v tooltip</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef, watch } from 'vue'
import { useAnimate } from 'motion-v'
import { Button, Tooltip, vTooltip } from 'vael-ui'

const toolbar = [
  { label: 'Bold', d: 'M5 2.5h4a2.5 2.5 0 0 1 0 5H5zM5 7.5h5a2.75 2.75 0 0 1 0 5.5H5z' },
  { label: 'Italic', d: 'M7 2.5h5M4 13.5h5M9.5 2.5l-3 11' },
  { label: 'Underline', d: 'M4 2.5v5a4 4 0 0 0 8 0v-5M3.5 13.5h9' },
  {
    label: 'Link',
    d: 'M6.5 9.5l3-3 M4.8 8 3.5 9.3a2.1 2.1 0 0 0 3 3L7.8 11 M11.2 8l1.3-1.3a2.1 2.1 0 0 0-3-3L8.2 5',
  },
  {
    label: 'Attach file',
    d: 'M10.5 4.5 5.9 9.1a1.5 1.5 0 0 0 2.1 2.1l5-5a3 3 0 0 0-4.2-4.2l-5 5a4.5 4.5 0 0 0 6.4 6.4l4.3-4.4',
  },
]

const motionTriggerRef = useTemplateRef('motionTriggerRef')
const motionTip = useTemplateRef('motionTip')
const motionOpen = shallowRef(false)
const [, animate] = useAnimate()

watch(motionOpen, (open) => {
  if (!open) return
  requestAnimationFrame(() => {
    const panel = motionTip.value?.panelEl
    if (!panel) return
    animate(
      panel,
      { opacity: [0, 1], scale: [0.6, 1], rotate: [-6, 0] },
      { type: 'spring', visualDuration: 0.3, bounce: 0.4 },
    )
  })
})

async function motionBeforeClose(done: () => void) {
  const panel = motionTip.value?.panelEl
  if (!panel) return done()
  await animate(panel, { opacity: 0, scale: 0.6, rotate: 6 }, { duration: 0.15 }).finished
  done()
}
</script>
