<template>
  <section class="demo">
    <h3>Rich content, the <code>&lt;Tooltip&gt;</code> component path</h3>
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
      Custom entrance/exit animation (motion-v): <code>force-mount</code> +
      <code>beforeClose(done)</code> + the exposed <code>panelEl</code> hand motion-v full control
      of entrance and exit, the same escape hatch Popover and Dialog use.
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
import { Button, Tooltip } from 'vael-ui'

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
  border: 1px solid var(--ui-border);
  border-radius: 3px;
  background: var(--ui-surface);
  font-family: monospace;
}
</style>
