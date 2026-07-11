<template>
  <section class="demo">
    <h2>Bouncy Accordion — a UI block</h2>
    <p class="note">
      A composed pattern (same tier as FamilyDrawerDemo/BloomMenuDemo below), not a raw primitive —
      reference:
      <a href="https://beui.dev/components/motion/bouncy-accordion" target="_blank" rel="noopener"
        >beui.dev's <code>BouncyAccordion</code></a
      >.
    </p>
    <div class="bouncy-stage">
      <Accordion v-model:value="bouncyValue" multiple :motion-css="false" class="bouncy-accordion">
        <motion.div
          v-for="(item, index) in bouncyItems"
          :key="item.value"
          class="bouncy-item"
          :initial="false"
          :animate="rowAnimate(index)"
          :transition="rowSpring"
        >
          <AccordionItem :value="item.value">
            <template #trigger="{ open }">
              <span class="bouncy-trigger">
                <span class="bouncy-trigger-title">{{ item.title }}</span>
                <motion.span
                  class="bouncy-chevron"
                  :initial="false"
                  :animate="{ rotate: open ? 180 : 0 }"
                  :transition="chevronSpring"
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none">
                    <path
                      d="M4 6l4 4 4-4"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </motion.span>
              </span>
            </template>
            <template #default="{ open }">
              <motion.div
                :initial="false"
                :animate="{ height: open ? 'auto' : 0 }"
                :transition="open ? openSpring : closeSpring"
                style="overflow: hidden"
              >
                <p class="bouncy-panel-text">{{ item.description }}</p>
              </motion.div>
            </template>
          </AccordionItem>
        </motion.div>
      </Accordion>
    </div>
    <p class="note bouncy-technical-note">
      Every moving part — panel height, corner radius, the 12px group gap, the chevron — runs on one
      spring family, all via <em>declarative</em> <code>&lt;motion.*&gt;</code> components
      (motion-v's imperative <code>useAnimate()</code> silently ignores spring timing for
      <code>height</code>; confirmed empirically). The content fade is the one piece the library
      still contributes: <code>.ui-accordion-body</code>'s opacity is <code>data-state</code>-driven
      and keeps working unchanged with <code>motionCss="false"</code>.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { motion, useReducedMotion } from 'motion-v'
import { Accordion, AccordionItem } from 'vael-ui'

const bouncyItems = [
  { value: 'design', title: 'Product Design', description: 'From wireframes to a shipped UI.' },
  { value: 'dev', title: 'Development', description: 'Vue 3, TypeScript, zero framework lock-in.' },
  { value: 'growth', title: 'Growth', description: 'Experiments, funnels, and retention loops.' },
  { value: 'ops', title: 'Operations', description: 'Billing, support, and the boring-but-vital.' },
]
const bouncyValue = shallowRef<string[]>(['design'])

const GROUP_RADIUS = 28
function rowAnimate(index: number) {
  const isOpen = (i: number) => bouncyValue.value.includes(bouncyItems[i].value)
  const open = isOpen(index)
  const prevOpen = index > 0 && isOpen(index - 1)
  const nextOpen = index < bouncyItems.length - 1 && isOpen(index + 1)
  const startsGroup = open || index === 0 || prevOpen
  const endsGroup = open || index === bouncyItems.length - 1 || nextOpen
  return {
    marginTop: index > 0 && (open || prevOpen) ? 12 : 0,
    borderTopLeftRadius: startsGroup ? GROUP_RADIUS : 0,
    borderTopRightRadius: startsGroup ? GROUP_RADIUS : 0,
    borderBottomLeftRadius: endsGroup ? GROUP_RADIUS : 0,
    borderBottomRightRadius: endsGroup ? GROUP_RADIUS : 0,
  }
}

const reduce = useReducedMotion()
function spring(duration: number, bounce: number) {
  return reduce.value ? ({ duration: 0 } as const) : ({ type: 'spring', duration, bounce } as const)
}
const rowSpring = computed(() => spring(0.55, 0.38))
const openSpring = computed(() => spring(0.58, 0.32))
const closeSpring = computed(() => spring(0.46, 0.26))
const chevronSpring = computed(() => spring(0.42, 0.28))
</script>

<style scoped>
.bouncy-stage {
  display: flex;
  justify-content: center;
  padding: 3rem 2rem;
}

.bouncy-accordion {
  inline-size: 100%;
  max-width: 24rem;
  /* drop-shadow (not box-shadow): the group's merged silhouette casts one
     shadow along its animated outline — per-item box-shadows would draw
     inner edges between merged rows. */
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.06)) drop-shadow(0 12px 24px rgb(0 0 0 / 0.08));
}
/* Radius/margin belong to motion (the wrapper's spring), so no CSS
   transitions on them here — two timing systems on one property fight. */
.bouncy-item {
  overflow: hidden;
  background: var(--ui-surface);
  transition: background-color 0.2s ease;
}
.bouncy-item:has(.ui-accordion-trigger:hover) {
  background: var(--ui-muted);
}
.bouncy-item :deep(.ui-accordion-item) {
  border-block: none;
}
.bouncy-item :deep(.ui-accordion-trigger) {
  min-block-size: 54px;
  padding: 0 1.25rem;
}
.bouncy-item :deep(.ui-accordion-body) {
  padding-block-end: 0;
}
.bouncy-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  inline-size: 100%;
}
.bouncy-trigger-title {
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: -0.006em;
}
.bouncy-chevron {
  display: grid;
  flex: none;
  place-items: center;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  color: var(--page-text-muted);
}
.bouncy-panel-text {
  margin: 0;
  padding: 0 1.25rem 1.25rem;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--page-text-muted);
}

.bouncy-technical-note {
  margin-block-start: 1.5rem;
  font-size: 0.8125rem;
  opacity: 0.85;
}
</style>
