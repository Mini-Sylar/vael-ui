<template>
  <section class="demo">
    <h2>Popover</h2>
    <p class="note">
      Anchor positioning via <code>@floating-ui/dom</code>: collision-aware auto-flip, live
      scroll/resize tracking, and an origin-aware default entrance (<code>transformOrigin</code> is
      computed per-open from the real resolved placement, not a fixed value). Link a trigger either
      with the co-located <code>#trigger</code> slot (shown below) or the decoupled
      <code>triggerEl</code> prop when the trigger has to live somewhere else in the template.
    </p>

    <h3>Basic popover</h3>
    <Popover v-model:open="basicOpen">
      <template #trigger="{ open, setTriggerEl }">
        <Button :ref="setTriggerEl" @click="basicOpen = !basicOpen">
          {{ open ? 'Close' : 'Open' }} popover
        </Button>
      </template>
      <template #default>
        <p class="panel-text">
          Plain content in the default slot. Escape, clicking outside, or re-clicking the trigger
          all close it.
        </p>
      </template>
    </Popover>

    <h3>Side / align, resize the window near an edge to see auto-flip</h3>
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

    <h3>Long content, capped to available space</h3>
    <p class="note">
      floating-ui's <code>size()</code> middleware measures real available space per-open and sets a
      <code>max-height</code> plus scroll on the panel, so long content never overflows the viewport
      regardless of where the trigger sits or how little room is left. The fade at the top/bottom
      edge is <code>v-scroll-mask</code>, the same directive Dialog's <code>scrollFade</code> prop
      uses internally.
    </p>
    <Popover v-model:open="longContentOpen">
      <template #trigger="{ open, setTriggerEl }">
        <Button :ref="setTriggerEl" variant="outline" @click="longContentOpen = !longContentOpen">
          {{ open ? 'Close' : 'Open' }} long content
        </Button>
      </template>
      <template #default>
        <p v-for="n in 12" :key="n" class="panel-text">
          Paragraph {{ n }}. This exists purely to overflow the panel's available space so the
          size() middleware's max-height and scroll actually have something to constrain.
        </p>
      </template>
    </Popover>

    <h3>Custom exit animation (motion-v): <code>forceMount</code> + <code>isClosing</code></h3>
    <p class="note">
      Popover Teleports its panel, so wrapping the whole component in
      <code>AnimatePresence</code> doesn't work; the escape hatch is <code>force-mount</code> plus
      <code>beforeClose(done)</code>. But the default slot also exposes a live
      <code>isClosing</code> flag, which is exactly what <code>AnimatePresence</code> needs for
      content that should visibly react to a close in progress: as soon as the user answers,
      <code>isClosing</code> flips true and the form cross-fades into a confirmation, and only once
      that finishes does <code>beforeClose</code> call <code>done()</code> to actually let the panel
      go away.
    </p>
    <div class="row">
      <Popover v-model:open="feedbackOpen" force-mount :before-close="feedbackBeforeClose">
        <template #trigger="{ open, setTriggerEl }">
          <Button :ref="setTriggerEl" variant="secondary" @click="feedbackOpen = !feedbackOpen">
            {{ open ? 'Close' : 'Rate this page' }}
          </Button>
        </template>
        <template #default="{ isClosing, close }">
          <AnimatePresence mode="wait">
            <motion.div
              v-if="!isClosing"
              key="form"
              :exit="{ opacity: 0, y: -4 }"
              :transition="{ duration: 0.15 }"
            >
              <p class="panel-text">Was this page helpful?</p>
              <div class="row">
                <Button size="sm" variant="outline" @click="close()">No</Button>
                <Button size="sm" @click="close()">Yes</Button>
              </div>
            </motion.div>
            <motion.div
              v-else
              key="thanks"
              :initial="{ opacity: 0, y: 4 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.15 }"
            >
              <p class="panel-text">Thanks for the feedback!</p>
            </motion.div>
          </AnimatePresence>
        </template>
      </Popover>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { Button, Popover } from 'vael-ui'
import type { PopoverAlign, PopoverSide } from 'vael-ui'

const basicOpen = shallowRef(false)
const longContentOpen = shallowRef(false)

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

const feedbackOpen = shallowRef(false)
function feedbackBeforeClose(done: () => void) {
  // isClosing flips true synchronously (see the default slot above), which
  // swaps the AnimatePresence child from the form to the "Thanks!" message.
  // Give it a moment to actually be seen before done() unmounts the panel.
  setTimeout(done, 700)
}
</script>
