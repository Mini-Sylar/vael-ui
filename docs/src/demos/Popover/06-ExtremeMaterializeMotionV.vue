<template>
  <section class="demo">
    <h3>Extreme: a panel that materializes out of its trigger (motion-v)</h3>
    <p class="note">
      <code>force-mount</code> hands the exposed <code>panelEl</code> to motion-v, and
      <code>beforeClose</code> holds the panel open for the exit. It grows out of the corner nearest
      the trigger, coming into focus on a soft spring, and fades back quicker than it came. Click
      the trigger mid-exit and it turns around from where it is.
    </p>
    <Popover
      ref="popover"
      v-model:open="open"
      force-mount
      side="bottom"
      align="start"
      :before-close="reduce ? undefined : materializeOut"
    >
      <template #trigger="{ setTriggerEl }">
        <Button :ref="setTriggerEl" variant="secondary" @click="toggle">Ada Lovelace</Button>
      </template>
      <template #default="{ close }">
        <div class="card">
          <div class="card-head">
            <Avatar name="Ada Lovelace" />
            <div>
              <p class="card-name">Ada Lovelace</p>
              <p class="card-meta">Analytical Engine team</p>
            </div>
          </div>
          <p class="card-text">Wrote the first published program, for a machine not yet built.</p>
          <div class="card-actions">
            <Button size="sm" variant="outline" @click="close">Dismiss</Button>
            <Button size="sm" @click="close">Follow</Button>
          </div>
        </div>
      </template>
    </Popover>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef, watch } from 'vue'
import { frame, useAnimate, useReducedMotion } from 'motion-v'
import { Avatar, Button, Popover } from 'vael-ui'

const open = shallowRef(false)
const popover = useTemplateRef('popover')
const reduce = useReducedMotion()
const [, animate] = useAnimate()
const easeOut = [0.23, 1, 0.32, 1] as const

let current: ReturnType<typeof animate> | null = null

// Popover sets transform-origin to the trigger side. motion-v writes its last values a frame
// late, so the cleanup waits for that render.
function settle(run: ReturnType<typeof animate>, panel: HTMLElement, then?: () => void) {
  void run.then(() => {
    if (current !== run) return
    current = null
    then?.()
    frame.postRender(() => {
      if (current) return
      for (const prop of ['opacity', 'transform', 'filter']) panel.style.removeProperty(prop)
    })
  })
}

function materializeIn(fresh = false) {
  const panel = popover.value?.panelEl
  if (!panel || reduce.value) return
  current?.stop()
  // Set the start state now, while the panel is still hidden. Keyframes land a frame later,
  // which would flash the panel at full size first.
  if (fresh)
    Object.assign(panel.style, { opacity: '0', transform: 'scale(0.9)', filter: 'blur(6px)' })
  // Opacity and blur ease out; only scale gets the spring, so blur never undershoots past 0.
  const run = animate(
    panel,
    fresh
      ? { opacity: [0, 1], scale: [0.9, 1], filter: ['blur(6px)', 'blur(0px)'] }
      : { opacity: 1, scale: 1, filter: 'blur(0px)' },
    { duration: 0.2, ease: easeOut, scale: { type: 'spring', duration: 0.35, bounce: 0.15 } },
  )
  current = run
  settle(run, panel)
}

function materializeOut(done: () => void) {
  const panel = popover.value?.panelEl
  if (!panel) return done()
  current?.stop()
  const run = animate(
    panel,
    { opacity: 0, scale: 0.96, filter: 'blur(2px)' },
    { duration: 0.15, ease: easeOut },
  )
  current = run
  settle(run, panel, done)
}

function toggle() {
  if (!open.value) open.value = true
  else if (popover.value?.isClosing) {
    // Cancel the pending close and spring back from the panel's current state.
    popover.value.cancelClose()
    materializeIn()
  } else popover.value?.close()
}

watch(open, (value) => {
  if (value) materializeIn(true)
})
</script>

<style scoped>
.card {
  inline-size: 16rem;
  display: grid;
  gap: 0.75rem;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.card-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.card-meta,
.card-text {
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
