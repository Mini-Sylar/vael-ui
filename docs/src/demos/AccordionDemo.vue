<template>
  <section class="demo">
    <h2>Accordion</h2>
    <p class="note">
      The panel is always mounted, <code>block-size</code> animates between <code>0</code> and a
      measured px value (Dialog's <code>naturalPanelSize</code> pin technique, the one sanctioned
      height-animation exception in this library), then releases back to auto once open so the
      content stays responsive. See <code>useCollapse.ts</code>.
    </p>

    <h3>Single selection (FAQ)</h3>
    <p class="note">
      Opening one item closes the previous one. Set <code>:collapsible="false"</code> if you want
      the currently open item to stay open when its own trigger is clicked, useful for a settings
      panel where some section should never fully collapse.
    </p>
    <Accordion v-model:value="singleValue" class="accordion-demo">
      <AccordionItem value="shipping" title="What are the shipping options?">
        Standard shipping takes 3-5 business days. Express arrives in 1-2 business days at checkout
        for an extra fee.
      </AccordionItem>
      <AccordionItem value="returns" title="What's the return policy?">
        Items can be returned within 30 days of delivery for a full refund, provided they're unused
        and in original packaging.
      </AccordionItem>
      <AccordionItem value="support" title="How do I contact support?" disabled>
        Disabled, this item can't be opened.
      </AccordionItem>
    </Accordion>

    <h3><code>multiple</code>, several items open at once</h3>
    <Accordion v-model:value="multipleValue" multiple class="accordion-demo">
      <AccordionItem value="a" title="Section A">Content for section A.</AccordionItem>
      <AccordionItem value="b" title="Section B">Content for section B.</AccordionItem>
      <AccordionItem value="c" title="Section C">Content for section C.</AccordionItem>
    </Accordion>

    <h3>Custom <code>#trigger</code>, the chevron is opt-in, not automatic</h3>
    <Accordion v-model:value="customValue" class="accordion-demo">
      <AccordionItem value="custom" title="This title is ignored, #trigger replaces it entirely">
        <template #trigger="{ open }">
          <span class="custom-trigger-title">
            {{ open ? '▾' : '▸' }} Custom trigger row, no chevron included by default
          </span>
        </template>
        The default slot content is unaffected by a custom trigger.
      </AccordionItem>
    </Accordion>

    <h3>Full external control, <code>motionCss="false"</code> + motion-v spring height</h3>
    <p class="note">
      The built-in transition is skipped entirely, a motion-v <code>&lt;motion.div&gt;</code> wraps
      the exposed <code>panelEl</code>'s content and springs its own height instead, proving the
      escape hatch, not just the default.
    </p>
    <Accordion v-model:value="springValue" :motion-css="false" class="accordion-demo">
      <AccordionItem value="spring" title="Spring-driven height">
        <motion.div
          :animate="{ height: springOpen ? springContentHeight : 0 }"
          :transition="{ type: 'spring', stiffness: 210, damping: 24 }"
          style="overflow: hidden"
        >
          <p ref="springContentRef" class="spring-panel-text">
            This panel's height is a motion-v spring, not the library's CSS transition. The
            Accordion only tracks which item is open, <code>motionCss="false"</code> means it
            renders no inline block-size style of its own at all.
          </p>
        </motion.div>
      </AccordionItem>
    </Accordion>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { motion } from 'motion-v'
import { Accordion, AccordionItem } from 'vael-ui'

const singleValue = shallowRef<string | null>('shipping')
const multipleValue = shallowRef<string[]>(['a'])
const customValue = shallowRef<string | null>(null)

const springValue = shallowRef<string | null>(null)
const springOpen = computed(() => springValue.value === 'spring')
const springContentRef = useTemplateRef<HTMLElement>('springContentRef')
const springContentHeight = computed(() => springContentRef.value?.scrollHeight ?? 0)
</script>

<style scoped>
.accordion-demo {
  max-width: 32rem;
  margin-block-end: 1.5rem;
}
.custom-trigger-title {
  font-weight: 500;
}
.spring-panel-text {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ui-text-muted);
}
</style>
