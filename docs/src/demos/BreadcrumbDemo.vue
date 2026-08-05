<template>
  <section class="demo">
    <h2>Breadcrumb</h2>
    <p class="note">
      No router opinion: <code>BreadcrumbItem</code>'s <code>as</code> prop defaults to
      <code>a</code>, but takes any tag or component — a real <code>RouterLink</code> below. Attrs
      (<code>to</code>, <code>href</code>, …) fall through untouched, the same pattern
      <code>Button</code> and <code>Card</code> already use for their own <code>as</code> prop.
    </p>

    <h3><code>items</code>: data-driven, with icons</h3>
    <p class="note">
      The last item defaults to <code>current</code> if you don't set it explicitly.
      <code>attrs</code> forwards anything extra straight to <code>BreadcrumbItem</code> —
      deliberately not a dedicated <code>href</code> field, since the right prop name depends on
      <code>as</code> (<code>href</code> for a plain link, <code>to</code> for a router one); baking
      in one would silently break the other.
    </p>
    <Breadcrumb :items="itemsData" />

    <h3>Composed, same result</h3>
    <p class="note">
      The same trail, built by hand from <code>BreadcrumbItem</code>/<code
        >BreadcrumbSeparator</code
      >
      instead — reach for this when a crumb needs custom content, not just a label.
    </p>
    <Breadcrumb>
      <BreadcrumbItem href="/">Home</BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem href="/docs">Docs</BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem current>Breadcrumb</BreadcrumbItem>
    </Breadcrumb>

    <h3><code>RouterLink</code>, real client-side navigation</h3>
    <p class="note">
      <code>as</code> takes any registered component by name — Vue Router auto-registers
      <code>RouterLink</code> globally, so the string name alone is enough, no import required.
    </p>
    <Breadcrumb>
      <BreadcrumbItem as="RouterLink" to="/">Home</BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem as="RouterLink" to="/components">Components</BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem current>Breadcrumb</BreadcrumbItem>
    </Breadcrumb>

    <h3>Custom separator</h3>
    <Breadcrumb>
      <BreadcrumbItem href="/">Home</BreadcrumbItem>
      <BreadcrumbSeparator>/</BreadcrumbSeparator>
      <BreadcrumbItem href="/docs">Docs</BreadcrumbItem>
      <BreadcrumbSeparator>/</BreadcrumbSeparator>
      <BreadcrumbItem current>Breadcrumb</BreadcrumbItem>
    </Breadcrumb>

    <h3>Overflow: default scroll vs. <code>wrap</code></h3>
    <p class="note">
      Default (<code>wrap</code> false): a single line that scrolls horizontally once it overflows
      its container, edge-faded so there's a visible cue there's more. Set <code>wrap</code> to
      break onto multiple lines instead.
    </p>
    <p class="note">Scrolls (default):</p>
    <Breadcrumb class="breadcrumb-narrow">
      <template v-for="(crumb, i) in longTrail" :key="crumb">
        <BreadcrumbItem v-if="i < longTrail.length - 1" href="#">{{ crumb }}</BreadcrumbItem>
        <BreadcrumbItem v-else current>{{ crumb }}</BreadcrumbItem>
        <BreadcrumbSeparator v-if="i < longTrail.length - 1" />
      </template>
    </Breadcrumb>
    <p class="note">Wraps:</p>
    <Breadcrumb wrap class="breadcrumb-narrow">
      <template v-for="(crumb, i) in longTrail" :key="crumb">
        <BreadcrumbItem v-if="i < longTrail.length - 1" href="#">{{ crumb }}</BreadcrumbItem>
        <BreadcrumbItem v-else current>{{ crumb }}</BreadcrumbItem>
        <BreadcrumbSeparator v-if="i < longTrail.length - 1" />
      </template>
    </Breadcrumb>

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

    <h3>Auto-populated from the router</h3>
    <p class="note">
      <code>useRoute()</code> plus a small computed is all it takes. This one is wired to
      <em>this actual docs site</em>: use the sidebar or search to navigate anywhere, then look back
      here.
    </p>
    <Breadcrumb :items="routeCrumbs" />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Breadcrumb, BreadcrumbItem, BreadcrumbSeparator, Menu, Resizable } from 'vael-ui'
import type { BreadcrumbItemData } from 'vael-ui'
import { PhDotsThree, PhFolder, PhHouse } from '@phosphor-icons/vue'

const itemsData: BreadcrumbItemData[] = [
  { label: 'Home', icon: PhHouse, attrs: { href: '/' } },
  { label: 'Docs', icon: PhFolder, attrs: { href: '/docs' } },
  { label: 'Breadcrumb' },
]

const longTrail = ['Home', 'Workspace', 'Projects', 'Marketing Site', 'Components', 'Breadcrumb']

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

function titleCase(segment: string): string {
  return decodeURIComponent(segment)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const route = useRoute()
const routeCrumbs = computed<BreadcrumbItemData[]>(() => {
  const segments = route.path.split('/').filter(Boolean)
  const crumbs: BreadcrumbItemData[] = [{ label: 'Home', as: 'RouterLink', attrs: { to: '/' } }]
  let path = ''
  for (const segment of segments) {
    path += `/${segment}`
    crumbs.push({ label: titleCase(segment), as: 'RouterLink', attrs: { to: path } })
  }
  return crumbs
})
</script>

<style scoped>
.breadcrumb-narrow {
  max-inline-size: 20rem;
  margin-block-end: 1rem;
}
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
