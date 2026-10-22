<template>
  <nav
    v-if="links.length > 0"
    ref="nav"
    class="on-this-page"
    :aria-label="t('component.onThisPage')"
  >
    <span ref="indicator" class="toc-indicator" aria-hidden="true" />
    <p class="label">{{ t('component.onThisPage') }}</p>
    <template v-for="link in links" :key="link.id">
      <a
        :href="`#${link.id}`"
        class="toc-link"
        :class="{ 'toc-link-active': link.id === activeId }"
        :aria-current="link.id === activeId ? 'location' : undefined"
        @click="onLinkClick(link.id)"
      >
        {{ link.label }}
        <span v-if="link.isNew" class="toc-new" :aria-label="t('component.new')" />
      </a>
      <!-- A section's own links, open while you're in it; the rail curves in to meet them. -->
      <div
        v-if="link.children?.length"
        class="toc-children"
        :data-open="expanded(link) || undefined"
      >
        <div class="toc-children-inner">
          <svg class="toc-curve" viewBox="0 0 32 14" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0.5 0 C0.5 9 31.5 5 31.5 14" />
          </svg>
          <a
            v-for="child in link.children"
            :key="child.id"
            :href="`#${child.id}`"
            class="toc-link toc-child"
            :class="{ 'toc-link-active': child.id === activeId }"
            :aria-current="child.id === activeId ? 'location' : undefined"
            :tabindex="expanded(link) ? undefined : -1"
            @click="onLinkClick(child.id)"
          >
            {{ child.label }}
          </a>
        </div>
      </div>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { shallowRef, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useGlidingIndicator } from '../composables/useGlidingIndicator'

interface TocLink {
  id: string
  label: string
  /** A "new" dot beside it. */
  isNew?: boolean
  /** Shown under it while it or one of them is the current section. */
  children?: { id: string; label: string }[]
}
const props = defineProps<{ links: TocLink[] }>()
const allLinks = () => props.links.flatMap((link) => [link, ...(link.children ?? [])])
const expanded = (link: TocLink) =>
  link.id === activeId.value || !!link.children?.some((child) => child.id === activeId.value)
const route = useRoute()
const { t } = useI18n()

const activeId = shallowRef<string | null>(null)

const nav = useTemplateRef<HTMLElement>('nav')
const indicator = useTemplateRef<HTMLElement>('indicator')
useGlidingIndicator(
  nav,
  indicator,
  () => nav.value?.querySelector<HTMLElement>('.toc-link-active'),
  () => [activeId.value, props.links.length],
)
const TARGET_Y = 88 // matches router.ts's scrollBehavior offset

// Closest heading to the target line wins, rather than "last one past a
// fixed line": short trailing sections (e.g. Slots/Events/Exposed all
// fitting on screen at once) can end up simultaneously past any fixed
// line, where "last past the line" always picks the same one regardless
// of which you actually scrolled to.
function updateActive() {
  let best: string | null = null
  let bestDistance = Infinity
  for (const link of allLinks()) {
    const distance = Math.abs(
      (document.getElementById(link.id)?.getBoundingClientRect().top ?? Infinity) - TARGET_Y,
    )
    if (distance < bestDistance) {
      bestDistance = distance
      best = link.id
    }
  }
  activeId.value = best
}

// A click's own smooth scroll can end with a neighbor geometrically "closer"
// to the target line (Slots/Events/Exposed all fitting on screen at once), so
// the clicked link holds until that scroll finishes, not for a fixed time.
let holdClicked = false
let holdTimer: ReturnType<typeof setTimeout> | undefined
function releaseHold() {
  holdClicked = false
  clearTimeout(holdTimer)
}
function onLinkClick(id: string) {
  activeId.value = id
  holdClicked = true
  clearTimeout(holdTimer)
  // Fallback for browsers without `scrollend`, or a click that doesn't scroll.
  holdTimer = setTimeout(releaseHold, 1200)
}

let ticking = false
function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    if (!holdClicked) updateActive()
    ticking = false
  })
}

onMounted(() => {
  // A short trailing section can't always reach the target line at all
  // (the page hits max scroll first), so geometry can't be trusted for it.
  // Trust an explicit #hash the same way a click is trusted.
  if (route.hash) onLinkClick(route.hash.slice(1))
  else updateActive()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('scrollend', releaseHold)
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('scrollend', releaseHold)
  clearTimeout(holdTimer)
})
</script>

<style scoped>
.on-this-page {
  position: sticky;
  top: calc(var(--docs-header-height) + 1.5rem);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-self: start;
  justify-self: end;
  width: 12rem;
  padding-left: 1.5rem;
  border-left: 1px solid var(--ui-border);
}

.label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ui-text-muted);
  margin-bottom: 0.25rem;
}

.toc-link {
  position: relative;
  font-size: 0.85rem;
  color: var(--ui-text-muted);
  text-decoration: none;
  transition: color var(--ui-duration-press) var(--ui-ease-out);
}

.toc-link:hover {
  color: var(--ui-text);
}

.toc-link-active {
  color: var(--ui-primary);
  font-weight: 600;
}

.toc-new {
  display: inline-block;
  inline-size: 0.375rem;
  block-size: 0.375rem;
  margin-inline-start: 0.35rem;
  vertical-align: 0.15em;
  border-radius: 50%;
  background: var(--ui-info);
}

/* Opens to its links' height; rarely toggled, so it eases rather than snapping. */
.toc-children {
  display: grid;
  grid-template-rows: 0fr;
  margin-block: -0.25rem;
  /* Clipped top and bottom only, so the curve can reach back to the main rail. */
  clip-path: inset(0 -1rem 0 -3rem);
  transition: grid-template-rows 250ms var(--ui-ease-out);
}

.toc-children[data-open] {
  grid-template-rows: 1fr;
}

.toc-children-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-block-size: 0;
  margin-inline-start: 0.5rem;
  padding: 0.85rem 0 0.25rem 0.875rem;
  opacity: 0;
  transition: opacity 200ms var(--ui-ease-out);
}

.toc-children[data-open] .toc-children-inner {
  opacity: 1;
}

/* Its own rail, below the curve that bends in from the main one. */
.toc-children-inner::before {
  content: '';
  position: absolute;
  inset: 0.85rem auto 0.25rem 0;
  border-inline-start: 1px solid var(--ui-border);
}

.toc-curve {
  position: absolute;
  top: 0;
  left: -2rem;
  inline-size: 2rem;
  block-size: 0.875rem;
  fill: none;
  stroke: var(--ui-border);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.toc-child {
  font-size: 0.8rem;
  line-height: 1.35;
}

@media (prefers-reduced-motion: reduce) {
  .toc-children,
  .toc-children-inner {
    transition: none;
  }
}

/* One bar for the whole list, gliding to the active link (useGlidingIndicator
   sets its offset and height). It sits over the nav's left rule. */
.toc-indicator {
  position: absolute;
  top: 0;
  left: -1.5px;
  width: 2px;
  border-radius: 9999px;
  background: var(--ui-primary);
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms var(--ui-ease-out);
}

@media (max-width: 1100px) {
  .on-this-page {
    display: none;
  }
}
</style>
