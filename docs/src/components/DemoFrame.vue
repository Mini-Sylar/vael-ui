<template>
  <div class="demo-list">
    <DemoExampleBlock
      v-for="example in rest"
      :key="example.id"
      :name="name"
      :example="example"
      :show-title="examples.length > 1"
    />
    <!-- The showpieces close the examples: each as first built, beside its twin on vael-ui's own
         motion, both with their code. -->
    <template v-if="highlights.length">
      <p class="demo-group-label">{{ t('motionDocs.showpieces.title') }}</p>
      <section v-for="example in highlights" :key="example.id" class="demo-pair">
        <h3 :id="anchorOf(example)" class="demo-pair-title">
          <a :href="`#${anchorOf(example)}`">{{ example.title }}</a>
        </h3>
        <div :ref="fitPair" class="demo-pair-sides" :data-twin="example.twin ? '' : undefined">
          <div class="demo-pair-side">
            <p v-if="example.twin" class="demo-pair-label">
              {{
                example.engine
                  ? t('motionDocs.showpieces.with', { engine: example.engine })
                  : t('motionDocs.showpieces.builtin')
              }}
            </p>
            <DemoExampleBlock :name="name" :example="example" :show-title="false" />
          </div>
          <div v-if="example.twin" class="demo-pair-side">
            <p class="demo-pair-label">{{ t('motionDocs.showpieces.vael') }}</p>
            <DemoExampleBlock :name="name" :example="example.twin" :show-title="false" />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import type { Component } from 'vue'
import { useI18n } from 'vue-i18n'
import DemoExampleBlock from './DemoExampleBlock.vue'

// A pair whose demo needs more than half the width (a two-month calendar) stacks, the twin under
// the original. The width it needed is remembered, so stacking (where it then fits) can't undo it.
const needed = new WeakMap<Element, number>()
const watching = new Set<Element>()
const observer =
  typeof ResizeObserver === 'undefined'
    ? undefined
    : new ResizeObserver((entries) => {
        for (const { target } of entries) {
          const sides = target.closest('.demo-pair-sides')
          if (sides) fit(sides as HTMLElement)
        }
      })
function fit(sides: HTMLElement) {
  let need = needed.get(sides) ?? 0
  for (const preview of sides.querySelectorAll<HTMLElement>('.demo-preview'))
    if (preview.scrollWidth > preview.clientWidth + 1) need = Math.max(need, preview.scrollWidth)
  needed.set(sides, need)
  const gap = parseFloat(getComputedStyle(sides).columnGap) || 0
  sides.toggleAttribute('data-stacked', need > (sides.clientWidth - gap) / 2)
}
function fitPair(el: unknown) {
  if (!(el instanceof HTMLElement) || !observer || watching.has(el)) return
  watching.add(el)
  observer.observe(el)
  // What each preview shows, as it mounts and changes size.
  for (const preview of el.querySelectorAll('.demo-preview')) {
    observer.observe(preview)
    new MutationObserver(() => {
      for (const child of preview.children) observer.observe(child)
    }).observe(preview, { childList: true, subtree: false })
    for (const child of preview.children) observer.observe(child)
  }
}
onBeforeUnmount(() => {
  observer?.disconnect()
  watching.clear()
})

export interface DemoExample {
  id: string
  title: string
  /** A recipe's note, shown above its preview. */
  note?: string
  vdomComponent: Component | null
  vaporComponent: Component | null
  vdomCode: string
  vaporCode: string
  /** One of the page's showpieces, listed last. */
  highlight?: boolean
  /** A showpiece's library as first built (`GSAP`, `motion`); unset, vael-ui's built-in look. */
  engine?: string
  /** The same showpiece made with vael-ui's own motion, shown beside it. */
  twin?: DemoExample
}

const props = defineProps<{
  name: string
  examples: DemoExample[]
}>()
const { t } = useI18n()
const highlights = computed(() => props.examples.filter((example) => example.highlight))
const rest = computed(() => props.examples.filter((example) => !example.highlight))
const anchorOf = (example: DemoExample) =>
  `example-${example.id.split('/').pop()!.replace(/^\d+-/, '')}`
</script>

<style scoped>
.demo-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  container-type: inline-size;
}

.demo-group-label {
  margin: 0 0 -1rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.demo-pair {
  display: grid;
  gap: 0.75rem;
}
.demo-pair-title {
  margin: 0;
  font-size: 1rem;
  scroll-margin-block-start: 5rem;
}
.demo-pair-title a {
  color: inherit;
  text-decoration: none;
}
.demo-pair-sides {
  display: grid;
  gap: 1.5rem;
}
.demo-pair-side {
  min-inline-size: 0;
}
.demo-pair-label {
  margin: 0 0 0.4rem;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  font-weight: 600;
}

/* Side by side once there's room for both to breathe, unless a demo needs more than half. */
@container (min-width: 52rem) {
  .demo-pair-sides[data-twin] {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .demo-pair-sides[data-twin][data-stacked] {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
