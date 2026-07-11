<template>
  <section class="demo">
    <h2>Tabs</h2>
    <p class="note">
      Tabs ships zero indicator markup or logic of its own — you render every
      <code>role="tab"</code> button yourself in the <code>#default</code> slot. The sliding
      indicator below each set is entirely opt-in. Arrow keys move selection and wrap at the ends.
    </p>

    <h3>Sliding indicator — CSS, built in via <code>useTabIndicator()</code></h3>
    <p class="note">
      The composable measures the active tab's real box and returns inline <code>translate</code> +
      <code>scale</code> (compositor-only — never <code>width</code>/<code>height</code>) — you
      render one extra element with those styles bound, pick a variant class, done. No JS animation
      loop, just a CSS <code>transition</code>. Ships two variants;
      <code>.ui-tabs-indicator--background</code> and <code>.ui-tabs-indicator--underline</code>
      here, but it's a plain class — style your own just as easily.
    </p>
    <div class="row">
      <Tabs ref="backgroundTabsRef" v-model:active="bgActive" :items="items">
        <template #default="{ active: current, select, items: list }">
          <div class="ui-tabs-indicator ui-tabs-indicator--background" :style="bgIndicatorStyle" />
          <button
            v-for="item in list"
            :key="item"
            role="tab"
            class="tab"
            :aria-selected="current === item"
            :tabindex="current === item ? 0 : -1"
            @click="select(item)"
          >
            <span class="tab-label">{{ item }}</span>
          </button>
        </template>
      </Tabs>

      <Tabs ref="underlineTabsRef" v-model:active="underlineActive" :items="items">
        <template #default="{ active: current, select, items: list }">
          <div
            class="ui-tabs-indicator ui-tabs-indicator--underline"
            :style="underlineIndicatorStyle"
          />
          <button
            v-for="item in list"
            :key="item"
            role="tab"
            class="tab"
            :aria-selected="current === item"
            :tabindex="current === item ? 0 : -1"
            @click="select(item)"
          >
            <span class="tab-label">{{ item }}</span>
          </button>
        </template>
      </Tabs>
    </div>

    <h3>Sliding indicator — full external control, motion-v</h3>
    <p class="note">
      Same zero-ownership contract, reached for a spring instead of the CSS default: a
      <code>motion.span</code> with a shared <code>layout-id</code> per tab, no composable needed.
      Quick, near-flat spring (duration 0.45s, bounce 0.15) — no playful overshoot on something
      pressed this often.
    </p>

    <Tabs v-model:active="active" :items="items" @change="onChange">
      <template #default="{ active: current, select, items: list }">
        <button
          v-for="item in list"
          :key="item"
          role="tab"
          class="tab"
          :aria-selected="current === item"
          :tabindex="current === item ? 0 : -1"
          @click="select(item)"
        >
          <motion.span
            v-if="current === item"
            layout-id="tab-indicator"
            class="tab-indicator"
            :transition="{ type: 'spring', duration: 0.45, bounce: 0.15 }"
          />
          <span class="tab-label">{{ item }}</span>
        </button>
      </template>
    </Tabs>

    <p class="note">
      EXTREME example: the panel below isn't part of Tabs at all — it's ordinary consumer markup
      keyed by <code>active</code>, and this demo swaps a plain crossfade for a directional,
      velocity-flavored spring slide (a slight overshoot, since the switch itself carries momentum —
      see the design guidance's damping/bounce distinction). Tabs has zero awareness this is
      happening.
    </p>
    <div class="panel-viewport">
      <AnimatePresence :initial="false">
        <motion.div
          :key="active"
          class="panel-content"
          :initial="{ x: direction * 48, opacity: 0 }"
          :animate="{ x: 0, opacity: 1 }"
          :exit="{ x: direction * -48, opacity: 0 }"
          :transition="{ type: 'spring', duration: 0.4, bounce: 0.2 }"
        >
          <h3>{{ panels[active].title }}</h3>
          <p class="panel-text">{{ panels[active].body }}</p>
        </motion.div>
      </AnimatePresence>
    </div>

    <h3>Disabled items + manual activation</h3>
    <p class="note">
      <code>activation="manual"</code>: arrow keys only move focus (tracked via the
      <code>focused</code> slot prop, driving tabindex here) — Enter/Space commits. "Archived" is
      disabled and gets skipped over by arrow/Home/End navigation entirely.
    </p>
    <Tabs v-model:active="manualActive" :items="manualItems" activation="manual">
      <template #default="{ focused, select, items: list }">
        <button
          v-for="item in list"
          :key="item"
          role="tab"
          class="tab tab--static"
          :aria-selected="manualActive === item"
          :aria-disabled="item === 'archived' || undefined"
          :disabled="item === 'archived'"
          :tabindex="focused === item ? 0 : -1"
          @click="select(item)"
        >
          <span class="tab-label">{{ item }}</span>
        </button>
      </template>
    </Tabs>
    <p class="panel-text">Selected: {{ manualActive }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { Tabs, useTabIndicator } from 'vael-ui'

type Section = 'overview' | 'analytics' | 'settings'
const items: Section[] = ['overview', 'analytics', 'settings']
const active = shallowRef<Section>('overview')

// Type explicitly to avoid circular generic inference in vue-tsc
interface TabsListElInstance {
  listEl: HTMLElement | null
}

const bgActive = shallowRef<Section>('overview')
const backgroundTabsRef = useTemplateRef<TabsListElInstance>('backgroundTabsRef')
const { style: bgIndicatorStyle } = useTabIndicator(bgActive, {
  listEl: computed(() => backgroundTabsRef.value?.listEl ?? null),
})

const underlineActive = shallowRef<Section>('overview')
const underlineTabsRef = useTemplateRef<TabsListElInstance>('underlineTabsRef')
const { style: underlineIndicatorStyle } = useTabIndicator(underlineActive, {
  listEl: computed(() => underlineTabsRef.value?.listEl ?? null),
})

const panels: Record<Section, { title: string; body: string }> = {
  overview: {
    title: 'Overview',
    body: 'Revenue, active users, and the week-over-week delta — the numbers that open a standup.',
  },
  analytics: {
    title: 'Analytics',
    body: 'Funnel breakdown by source, with a cohort retention curve underneath.',
  },
  settings: {
    title: 'Settings',
    body: 'Workspace name, billing plan, and the danger-zone delete-workspace action.',
  },
}

// Panel slides with directional momentum; Tabs unaware of this rendering
const direction = shallowRef(1)
// Closure var to track previous index; @change fires after Tabs flips v-model
let previousIndex = items.indexOf(active.value)
function onChange(item: Section) {
  const next = items.indexOf(item)
  direction.value = next > previousIndex ? 1 : -1
  previousIndex = next
}

const manualItems = ['inbox', 'sent', 'archived', 'drafts']
const manualActive = shallowRef('inbox')
</script>
