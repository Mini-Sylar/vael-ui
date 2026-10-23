<template>
  <section class="demo">
    <h3>Extreme: a panel that materializes out of its trigger (motion-v)</h3>
    <p class="note">
      A <code>motion</code> object hands the panel to motion-v. It grows out of the corner nearest
      the trigger, coming into focus on a soft spring, and fades back quicker than it came. Click
      the trigger mid-exit and it turns around from where it is.
    </p>
    <Popover v-model:open="open" side="bottom" align="start" :motion="materialize">
      <template #trigger="{ setTriggerEl }">
        <Button :ref="setTriggerEl" variant="secondary" @click="open = !open">Ada Lovelace</Button>
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
import { shallowRef } from 'vue'
import { animate, frame } from 'motion-v'
import { Avatar, Button, Popover } from 'vael-ui'
import type { PopoverMotion } from 'vael-ui'

const open = shallowRef(false)
const easeOut = [0.23, 1, 0.32, 1] as const

interface Look {
  opacity: number
  scale: number
  blur: number
}
const hidden: Look = { opacity: 0, scale: 0.9, blur: 6 }

// Reopened mid-exit, Vue renders a fresh panel: it picks up from the one that was leaving.
let leaving: HTMLElement | null = null

// Where a panel caught mid-exit was, read from the styles motion-v left on it.
function caught(el: HTMLElement): Look {
  const { opacity, transform, filter } = el.style
  return {
    opacity: opacity ? Number(opacity) : 1,
    scale: Number(/scale\(([\d.]+)\)/.exec(transform)?.[1] ?? 1),
    blur: Number(/blur\(([\d.]+)px\)/.exec(filter)?.[1] ?? 0),
  }
}

const materialize: PopoverMotion = {
  enter({ panel }) {
    const from = leaving ? caught(leaving) : hidden
    leaving = null
    // Written now: motion-v's first frame lands a frame late and would flash the panel at rest.
    Object.assign(panel.style, {
      opacity: String(from.opacity),
      transform: `scale(${from.scale})`,
      filter: `blur(${from.blur}px)`,
    })
    // Opacity and blur ease out; only scale gets the spring, so blur never undershoots past 0.
    const run = animate(
      panel,
      {
        opacity: [from.opacity, 1],
        scale: [from.scale, 1],
        filter: [`blur(${from.blur}px)`, 'blur(0px)'],
      },
      { duration: 0.2, ease: easeOut, scale: { type: 'spring', duration: 0.35, bounce: 0.15 } },
    )
    // motion-v writes its last values a frame late, so the cleanup waits for that render.
    void run.then(() =>
      frame.postRender(() => {
        for (const prop of ['opacity', 'transform', 'filter']) panel.style.removeProperty(prop)
      }),
    )
    return run
  },
  leave({ panel }) {
    leaving = panel
    const run = animate(
      panel,
      { opacity: 0, scale: 0.96, filter: 'blur(2px)' },
      { duration: 0.15, ease: easeOut },
    )
    void run.then(() => {
      if (leaving === panel) leaving = null
    })
    return run
  },
}
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
