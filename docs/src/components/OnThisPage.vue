<template>
  <nav
    v-if="links.length > 0"
    ref="nav"
    class="on-this-page"
    :aria-label="t('component.onThisPage')"
  >
    <span ref="indicator" class="toc-indicator" aria-hidden="true" />
    <p class="label">{{ t('component.onThisPage') }}</p>
    <a
      v-for="link in links"
      :key="link.id"
      :href="`#${link.id}`"
      class="toc-link"
      :class="{ 'toc-link-active': link.id === activeId }"
      :aria-current="link.id === activeId ? 'location' : undefined"
      @click="onLinkClick(link.id)"
    >
      {{ link.label }}
    </a>
  </nav>
</template>

<script setup lang="ts">
import { shallowRef, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useGlidingIndicator } from '../composables/useGlidingIndicator'

const props = defineProps<{ links: { id: string; label: string }[] }>()
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
  for (const link of props.links) {
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
