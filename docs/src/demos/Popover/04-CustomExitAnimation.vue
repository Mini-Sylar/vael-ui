<template>
  <section class="demo">
    <h3>Custom animation (motion-v): <code>forceMount</code> + <code>beforeClose</code></h3>
    <p class="note">
      <code>force-mount</code> turns off the built-in transition and hands you the panel: motion-v
      animates the exposed <code>panelEl</code> in when it opens, and
      <code>beforeClose(done)</code> runs the exit before calling <code>done()</code>. Answering
      swaps in a thank-you first; clicking outside or pressing Escape just closes.
    </p>
    <div class="row">
      <Popover
        ref="popover"
        v-model:open="feedbackOpen"
        force-mount
        open-on-trigger-click
        :before-close="feedbackBeforeClose"
      >
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
import { shallowRef, useTemplateRef, watch } from 'vue'
import { AnimatePresence, motion, useAnimate } from 'motion-v'
import { Button, Popover } from 'vael-ui'

const popover = useTemplateRef('popover')
const feedbackOpen = shallowRef(false)
const answered = shallowRef(false)
const [, animate] = useAnimate()
const easeOut = [0.23, 1, 0.32, 1] as const

watch(feedbackOpen, (open) => {
  if (!open) return
  answered.value = false
  requestAnimationFrame(() => {
    const panel = popover.value?.panelEl
    if (!panel) return
    animate(panel, { opacity: [0, 1], scale: [0.96, 1] }, { duration: 0.2, ease: easeOut })
  })
})

function answer(close: () => void) {
  answered.value = true
  close()
}

async function feedbackBeforeClose() {
  const panel = popover.value?.panelEl
  if (!panel) return true
  // Long enough to read the thank-you.
  if (answered.value) await new Promise((resolve) => setTimeout(resolve, 900))
  await animate(panel, { opacity: 0, scale: 0.96 }, { duration: 0.15, ease: easeOut }).finished
  return true
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
