<template>
  <nav class="on-this-page" aria-label="On this page">
    <p class="label">On this page</p>
    <a
      v-for="link in links"
      :key="link.id"
      :href="`#${link.id}`"
      class="toc-link"
      :class="{ 'toc-link-active': link.id === activeId }"
      @click="onLinkClick(link.id)"
    >
      {{ link.label }}
    </a>
  </nav>
</template>

<script setup lang="ts">
import { shallowRef, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps<{ links: { id: string; label: string }[] }>()
const route = useRoute()

const activeId = shallowRef<string | null>(null)
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

// A click's own resulting scroll can be too small to move a compressed
// trailing section's heading noticeably (Slots/Events/Exposed all fitting
// on screen at once), so the very next recompute can immediately overrule
// the click with a geometrically "closer" neighbor. Give the clicked link
// a short grace window before scroll tracking resumes.
let ignoreScrollUntil = 0
function onLinkClick(id: string) {
  activeId.value = id
  ignoreScrollUntil = Date.now() + 600
}

let ticking = false
function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    if (Date.now() >= ignoreScrollUntil) updateActive()
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
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))
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

.toc-link-active::before {
  content: '';
  position: absolute;
  left: -1.5625rem;
  top: 0.15rem;
  bottom: 0.15rem;
  width: 2px;
  border-radius: 9999px;
  background: var(--ui-primary);
}

@media (max-width: 1100px) {
  .on-this-page {
    display: none;
  }
}
</style>
