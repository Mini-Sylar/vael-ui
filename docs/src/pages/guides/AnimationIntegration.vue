<template>
  <article class="prose">
    <h1>Bring your own animation</h1>
    <p>
      Every component that animates ships a plain CSS transition, but exposes a real escape hatch to
      drive it with GSAP, motion-v, or nothing at all. Check a component's own Props/Slots/Exposed
      tables for which of these it has, not every component has all three.
    </p>

    <h2>motionCss</h2>
    <p>
      <code>false</code> disables the built-in CSS transition, the component still changes state
      instantly, leaving the DOM ready for you to animate.
    </p>

    <h2>forceMount</h2>
    <p>
      Keeps content mounted while closed instead of removing it on <code>v-if</code>. Pair with
      <code>&lt;AnimatePresence&gt;</code> and the default slot's <code>isClosing</code> flag to own
      exit timing yourself.
    </p>

    <h2>beforeClose(done)</h2>
    <p>
      For imperative libraries: pass a function that receives <code>done</code>. The component stays
      mounted and <code>isClosing</code> until you call it.
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
