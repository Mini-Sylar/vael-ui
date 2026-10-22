<template>
  <section class="demo">
    <h3>Custom animation (motion-v)</h3>
    <p class="note">
      A <code>motion</code> object hands the panel to motion-v's <code>animate()</code> as it opens
      and closes, and Popover waits for the exit before removing it. Answering swaps in a thank-you
      and closes a moment later; clicking outside or pressing Escape closes at once.
    </p>
    <div class="row">
      <Popover v-model:open="feedbackOpen" open-on-trigger-click :motion="look">
        <template #trigger="{ open }">
          <Button variant="secondary">{{ open ? 'Close' : 'Rate this page' }}</Button>
        </template>
        <template #default="{ close }">
          <AnimatePresence mode="wait" :initial="false">
            <motion.div
              v-if="!answered"
              key="form"
              :exit="{ opacity: 0, y: -4 }"
              :transition="{ duration: 0.15 }"
            >
              <p class="panel-text">Was this page helpful?</p>
              <div class="row">
                <Button size="sm" variant="outline" @click="answer(close)">No</Button>
                <Button size="sm" @click="answer(close)">Yes</Button>
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
import { shallowRef, watch } from 'vue'
import { AnimatePresence, animate, motion } from 'motion-v'
import { Button, Popover } from 'vael-ui'
import type { PopoverMotion } from 'vael-ui'

const feedbackOpen = shallowRef(false)
const answered = shallowRef(false)
const easeOut = [0.23, 1, 0.32, 1] as const
let closing: ReturnType<typeof setTimeout> | undefined

const look: PopoverMotion = {
  enter: ({ panel }) =>
    animate(panel, { opacity: [0, 1], scale: [0.96, 1] }, { duration: 0.2, ease: easeOut }),
  leave: ({ panel }) =>
    animate(panel, { opacity: 0, scale: 0.96 }, { duration: 0.15, ease: easeOut }),
}

watch(feedbackOpen, (open) => {
  clearTimeout(closing)
  if (open) answered.value = false
})

function answer(close: () => void) {
  answered.value = true
  // Long enough to read the thank-you.
  closing = setTimeout(close, 900)
}
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.panel-text {
  font-size: 0.8125rem;
}
</style>
