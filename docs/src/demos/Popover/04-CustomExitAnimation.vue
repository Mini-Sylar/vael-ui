<template>
  <section class="demo">
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
import { shallowRef } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { Button, Popover } from 'vael-ui'

const feedbackOpen = shallowRef(false)
function feedbackBeforeClose(done: () => void) {
  setTimeout(done, 700)
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
