<template>
  <section class="demo">
    <h3>Rich content with the <code>&lt;Tooltip&gt;</code> component</h3>
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
          You can move onto me and select this text, or
          <a href="#" @click.prevent>click this link</a>.
        </span>
      </Tooltip>
    </div>

    <p class="note">
      Custom animation (motion-v): <code>enter</code> and <code>leave</code> hooks in
      <code>motion</code> animate the panel with motion-v, as they do on Popover and Dialog.
    </p>
    <div class="row">
      <Tooltip :open-delay="200" :trigger-el="motionTriggerRef" :motion="sprung">
        <span>Sprung by motion-v.</span>
      </Tooltip>
      <Button ref="motionTriggerRef" variant="secondary">motion-v tooltip</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { animate } from 'motion-v'
import { Button, Tooltip } from 'vael-ui'
import type { TooltipMotion } from 'vael-ui'

const motionTriggerRef = useTemplateRef('motionTriggerRef')

const sprung: TooltipMotion = {
  enter: ({ panel }) =>
    animate(
      panel,
      { opacity: [0, 1], scale: [0.6, 1], rotate: [-6, 0] },
      { type: 'spring', visualDuration: 0.3, bounce: 0.4 },
    ),
  leave: ({ panel }) => animate(panel, { opacity: 0, scale: 0.6, rotate: 6 }, { duration: 0.15 }),
}
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.rich-tip {
  display: grid;
  gap: 0.375rem;
  padding: 1rem;
}
.rich-tip-kbd {
  display: flex;
  gap: 0.25rem;
  margin-block-start: 0.5rem;
  font-size: 0.75rem;
}
.rich-tip-kbd kbd {
  padding: 0.25rem 0.375rem;
  border: 1px solid color-mix(in srgb, currentColor 35%, transparent);
  border-radius: 3px;
  background: color-mix(in srgb, currentColor 15%, transparent);
  color: inherit;
  font-family: monospace;
}
</style>
