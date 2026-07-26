<template>
  <article class="prose">
    <h1>{{ t('animation.title') }}</h1>
    <p>{{ t('animation.intro') }}</p>

    <h2>{{ t('animation.motionCssTitle') }}</h2>
    <p v-html="t('animation.motionCssIntro')" />

    <h2>{{ t('animation.forceMountTitle') }}</h2>
    <p v-html="t('animation.forceMountIntro')" />

    <h2>{{ t('animation.beforeCloseTitle') }}</h2>
    <p v-html="t('animation.beforeCloseIntro')" />

    <h2>{{ t('animation.motionVExampleTitle') }}</h2>
    <p v-html="t('animation.motionVExampleIntro')" />
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

    <h2>{{ t('animation.gsapExampleTitle') }}</h2>
    <p v-html="t('animation.gsapExampleIntro')" />
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
import { useI18n } from 'vue-i18n'
import CodeBlock from '../../components/CodeBlock.vue'

const { t } = useI18n()
</script>
