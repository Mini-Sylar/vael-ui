<template>
  <section class="demo">
    <h2>Popover</h2>
    <p class="note">
      Anchor positioning via <code>@floating-ui/dom</code> — collision-aware auto-flip, live
      scroll/resize tracking, and an origin-aware default entrance (<code>transformOrigin</code> is
      computed per-open from the real resolved placement, not a fixed value).
    </p>

    <h3>Trigger linking — both ways resolve to the same internal ref</h3>
    <div class="row">
      <Button ref="basicTriggerRef" @click="basicOpen = !basicOpen">
        {{ basicOpen ? 'Close' : 'Open' }} (triggerEl prop)
      </Button>
      <Popover v-model:open="basicOpen" :trigger-el="basicTriggerRef">
        <p>Linked via the decoupled <code>triggerEl</code> prop.</p>
      </Popover>

      <Popover v-model:open="slotOpen">
        <template #trigger="{ open, setTriggerEl }">
          <Button :ref="setTriggerEl" variant="outline" @click="slotOpen = !slotOpen">
            {{ open ? 'Close' : 'Open' }} (#trigger slot)
          </Button>
        </template>
        <template #default>
          <p>
            Linked via the co-located <code>#trigger</code> slot — <code>setTriggerEl</code> is a
            plain Vue function ref, bound directly onto the Button above with no wrapper node.
          </p>
        </template>
      </Popover>
    </div>

    <h3>Side / align — try resizing the window near the edges to see auto-flip</h3>
    <div class="row">
      <Popover
        v-for="config in sideAlignConfigs"
        :key="`${config.side}-${config.align}`"
        v-model:open="sideAlignOpen[`${config.side}-${config.align}`]"
        :side="config.side"
        :align="config.align"
      >
        <template #trigger="{ open, setTriggerEl }">
          <Button
            :ref="setTriggerEl"
            size="sm"
            variant="secondary"
            @click="toggleSideAlign(config.side, config.align)"
          >
            {{ config.side }}/{{ config.align }}{{ open ? ' ×' : '' }}
          </Button>
        </template>
        <template #default>
          <p class="panel-text">side="{{ config.side }}" align="{{ config.align }}"</p>
        </template>
      </Popover>
    </div>

    <p class="note">
      EXTREME example: <code>force-mount</code> + <code>beforeClose(done)</code> + the exposed
      <code>panelEl</code> — the same recipe Dialog's imperative demos use. motion-v's
      <code>useAnimate()</code> drives a spring-based grow-from-trigger, reading
      <code>transformOrigin</code> from the resolved placement so it always grows from the correct
      anchored corner, whichever edge auto-flip actually lands it on.
    </p>
    <div class="row">
      <Button ref="motionTriggerRef" variant="secondary" @click="motionEnter">
        {{ motionOpen ? 'Close' : 'Open' }} (motion-v spring)
      </Button>
      <Popover
        ref="motionPopover"
        v-model:open="motionOpen"
        force-mount
        :trigger-el="motionTriggerRef"
        :before-close="motionBeforeClose"
      >
        <template #default="{ close }">
          <p class="panel-text">Grows from the trigger with a spring, shrinks back on close.</p>
          <Button size="sm" @click="close()">Close</Button>
        </template>
      </Popover>
    </div>

    <h3>Long content — capped to available space, not the viewport</h3>
    <p class="note">
      floating-ui's <code>size()</code> middleware measures real available space per-open and sets a
      <code>max-height</code> + scroll on the panel, so long content never overflows the viewport
      regardless of where the trigger sits or how little room is left. The fade at the top/bottom
      edge is <code>v-scroll-mask</code> — the same directive Dialog's <code>scrollFade</code> prop
      uses internally, extracted so any scrollable element can opt in.
    </p>
    <div class="row">
      <Popover v-model:open="longContentOpen">
        <template #trigger="{ open, setTriggerEl }">
          <Button :ref="setTriggerEl" variant="outline" @click="longContentOpen = !longContentOpen">
            {{ open ? 'Close' : 'Open' }} long content
          </Button>
        </template>
        <template #default>
          <p v-for="n in 12" :key="n" class="panel-text">
            Paragraph {{ n }}. This exists purely to overflow the panel's available space so the
            size() middleware's max-height + scroll actually has something to constrain.
          </p>
        </template>
      </Popover>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, shallowRef, useTemplateRef } from 'vue'
import { useAnimate } from 'motion-v'
import { Button, Popover } from 'vael-ui'
import type { PopoverAlign, PopoverSide } from 'vael-ui'

const basicTriggerRef = useTemplateRef('basicTriggerRef')
const basicOpen = shallowRef(false)
const longContentOpen = shallowRef(false)

const slotOpen = shallowRef(false)

const sideAlignConfigs: { side: PopoverSide; align: PopoverAlign }[] = [
  { side: 'top', align: 'start' },
  { side: 'bottom', align: 'center' },
  { side: 'right', align: 'end' },
  { side: 'left', align: 'center' },
]
const sideAlignOpen = reactive<Record<string, boolean>>({})
function toggleSideAlign(side: PopoverSide, align: PopoverAlign) {
  const key = `${side}-${align}`
  sideAlignOpen[key] = !sideAlignOpen[key]
}

// Exit animation via beforeClose escape hatch (Teleport + AnimatePresence broken)
const motionTriggerRef = useTemplateRef('motionTriggerRef')
const motionOpen = shallowRef(false)
const motionPopover = useTemplateRef('motionPopover')
const [, animateMotion] = useAnimate()

function motionEnter() {
  if (motionOpen.value) {
    motionPopover.value?.close()
    return
  }
  motionOpen.value = true
  requestAnimationFrame(() => {
    const panel = motionPopover.value?.panelEl
    if (!panel) return
    animateMotion(
      panel,
      { opacity: [0, 1], scale: [0.75, 1] },
      { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }, // spring-flavored overshoot
    )
  })
}

async function motionBeforeClose(done: () => void) {
  const panel = motionPopover.value?.panelEl
  if (!panel) return done()
  await animateMotion(panel, { opacity: 0, scale: 0.75 }, { duration: 0.2, ease: 'easeIn' })
    .finished
  done()
}
</script>
