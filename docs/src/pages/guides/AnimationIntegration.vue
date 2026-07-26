<template>
  <article class="prose">
    <h1>Bring your own animation</h1>
    <p>
      vael-ui ships a plain CSS transition on everything that opens, closes, or toggles, but nothing
      here is required. Every component that animates gives you a real escape hatch to drive that
      same motion with GSAP, motion-v, the Web Animations API, or nothing at all. This page covers
      the three hooks that make that possible, and shows a minimal example with each of the two
      motion libraries used elsewhere in this project.
    </p>
    <p>
      Not every component exposes all three. Check the Props, Slots, and Exposed tables on a
      component's own page to see what it actually has.
    </p>

    <h2>motionCss</h2>
    <p>
      Set to <code>false</code> and the built-in CSS transition turns off. The component still
      changes state (open, closed, checked, whatever), it just does it instantly with no transition
      of its own, leaving the DOM ready for you to animate however you want.
    </p>

    <h2>forceMount</h2>
    <p>
      Keeps the component's content in the DOM even while closed, instead of removing it the moment
      <code>open</code> turns false. This hands mount and unmount timing to you: pair it with
      something like <code>&lt;AnimatePresence&gt;</code> so your own library decides when the
      element actually leaves, not Vue's <code>v-if</code>. Most of these components also expose an
      <code>isClosing</code> state through their default slot, for exactly this pairing.
    </p>

    <h2>beforeClose(done)</h2>
    <p>
      For imperative libraries that need to run a tween before anything unmounts. Pass a function
      that receives a <code>done</code> callback: the component stays mounted and reports
      <code>isClosing</code> until you call it, so it can finish out its own exit animation instead
      of ceding the panel to Vue outright.
    </p>

    <h2>Example: motion-v, Popover</h2>
    <p>
      <code>forceMount</code> plus the default slot's <code>isClosing</code> flag, wrapped in
      <code>&lt;AnimatePresence&gt;</code>:
    </p>
    <CodeBlock
      code='&lt;script setup lang="ts"&gt;
import { AnimatePresence, motion } from "motion-v"
import { Popover } from "vael-ui"
&lt;/script&gt;

<template>
  <Popover force-mount v-model:open="open">
    <template #trigger="{ setTriggerEl }">
      <button :ref="setTriggerEl">Open</button>
    </template>
    <template #default="{ isClosing }">
      <AnimatePresence>
        <motion.div
          v-if="!isClosing"
          :initial="{ opacity: 0, scale: 0.95 }"
          :animate="{ opacity: 1, scale: 1 }"
          :exit="{ opacity: 0, scale: 0.95 }"
        >
          Popover content
        </motion.div>
      </AnimatePresence>
    </template>
  </Popover>
</template>'
    />

    <h2>Example: GSAP, Dialog</h2>
    <p>
      <code>beforeClose(done)</code> plus the exposed <code>panelEl</code> ref, so the tween runs on
      the real panel element before it's removed:
    </p>
    <CodeBlock
      code='&lt;script setup lang="ts"&gt;
import { ref } from "vue"
import gsap from "gsap"
import { Dialog } from "vael-ui"

const dialogRef = ref<InstanceType<typeof Dialog>>()
const open = ref(false)

function beforeClose(done: () => void) {
  gsap.to(dialogRef.value?.panelEl, {
    opacity: 0,
    y: 8,
    duration: 0.2,
    onComplete: done,
  })
}
&lt;/script&gt;

<template>
  <Dialog ref="dialogRef" v-model:open="open" :before-close="beforeClose">
    Dialog content
  </Dialog>
</template>'
    />
  </article>
</template>

<script setup lang="ts">
import CodeBlock from '../../components/CodeBlock.vue'
</script>
