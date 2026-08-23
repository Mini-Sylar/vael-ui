<template>
  <section class="demo">
    <h3>Responsive collapse: middle items into a <code>Menu</code> popup</h3>
    <p class="note">
      Not a built-in feature — <code>Breadcrumb</code> stays a dumb primitive on purpose. This is
      the recipe: a <code>ResizeObserver</code> on the container drives how many crumbs fit, the
      hidden middle ones move into a <code>Menu</code> triggered by a "…" item. Drag the handle to
      resize and watch it collapse/expand live.
    </p>
    <Resizable v-model:size="resizableSize" class="breadcrumb-resizable" :min="140" :max="480">
      <div ref="collapseContainer" class="breadcrumb-collapse-container">
        <Breadcrumb>
          <template v-for="(crumb, i) in visibleCrumbs" :key="i">
            <li v-if="crumb === 'ellipsis'" class="ui-breadcrumb-item">
              <Menu
                :items="hiddenCrumbs.map((c) => ({ label: c.label, value: c.label }))"
                @select="(item) => (lastHiddenPick = item.label)"
              >
                <template #trigger>
                  <button
                    type="button"
                    class="breadcrumb-ellipsis-trigger"
                    aria-label="Show hidden breadcrumb items"
                  >
                    <PhDotsThree weight="bold" />
                  </button>
                </template>
              </Menu>
            </li>
            <BreadcrumbItem
              v-else
              :as="crumb.as"
              v-bind="crumb.attrs"
              :current="i === visibleCrumbs.length - 1"
              >{{ crumb.label }}</BreadcrumbItem
            >
            <BreadcrumbSeparator v-if="i < visibleCrumbs.length - 1" />
          </template>
        </Breadcrumb>
      </div>
    </Resizable>
    <p v-if="lastHiddenPick" class="note">
      Picked from the popup: <code>{{ lastHiddenPick }}</code>
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import { Breadcrumb, BreadcrumbItem, BreadcrumbSeparator, Menu, Resizable } from 'vael-ui'
import type { BreadcrumbItemData } from 'vael-ui'
import { PhDotsThree } from '@phosphor-icons/vue'

const allCrumbs: BreadcrumbItemData[] = [
  { label: 'Home', attrs: { href: '#' } },
  { label: 'Workspace', attrs: { href: '#' } },
  { label: 'Projects', attrs: { href: '#' } },
  { label: 'Marketing Site', attrs: { href: '#' } },
  { label: 'Pages', attrs: { href: '#' } },
  { label: 'Homepage' },
]

const resizableSize = shallowRef(480)
const collapseContainer = useTemplateRef('collapseContainer')
const containerWidth = shallowRef(480)
let resizeObserver: ResizeObserver | undefined
watch(
  collapseContainer,
  (el) => {
    resizeObserver?.disconnect()
    if (!el) return
    resizeObserver = new ResizeObserver(([entry]) => {
      containerWidth.value = entry!.contentRect.width
    })
    resizeObserver.observe(el)
  },
  { immediate: true },
)
onBeforeUnmount(() => resizeObserver?.disconnect())

const maxVisible = computed(() => {
  if (containerWidth.value < 220) return 2
  if (containerWidth.value < 340) return 3
  if (containerWidth.value < 420) return 4
  return allCrumbs.length
})

const hiddenCrumbs = computed<BreadcrumbItemData[]>(() => {
  const hideCount = allCrumbs.length - maxVisible.value
  if (hideCount <= 0) return []
  return allCrumbs.slice(1, 1 + hideCount)
})

const visibleCrumbs = computed<(BreadcrumbItemData | 'ellipsis')[]>(() => {
  if (hiddenCrumbs.value.length === 0) return allCrumbs
  const tailCount = maxVisible.value - 1
  return [allCrumbs[0]!, 'ellipsis', ...allCrumbs.slice(allCrumbs.length - tailCount)]
})

const lastHiddenPick = shallowRef<string | null>(null)
</script>

<style scoped>
.breadcrumb-resizable {
  margin-block-end: 0.5rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  padding: 0.75rem 1rem;
}
.breadcrumb-collapse-container {
  min-inline-size: 0;
}
.breadcrumb-ellipsis-trigger {
  display: grid;
  place-items: center;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  border: 0;
  border-radius: calc(var(--ui-radius) - 6px);
  background: var(--ui-muted);
  color: var(--ui-text-muted);
  cursor: pointer;
}
</style>
