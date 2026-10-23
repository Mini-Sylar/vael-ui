<template>
  <nav
    v-if="links.length > 0"
    ref="nav"
    class="on-this-page"
    :aria-label="t('component.onThisPage')"
  >
    <!-- One rail for the page, branching out to a section's own links and back; the indicator is
         a lit stretch of the same path, so it travels around the curves to get there. -->
    <svg class="toc-rail" :width="RAIL_WIDTH" :height="railHeight" aria-hidden="true">
      <path class="toc-rail-line" :d="railPath" />
      <path ref="lit" class="toc-rail-lit" :d="railPath" />
    </svg>
    <p class="label">{{ t('component.onThisPage') }}</p>
    <template v-for="link in links" :key="link.id">
      <a
        :href="`#${link.id}`"
        class="toc-link"
        :class="{ 'toc-link-active': link.id === activeId }"
        :data-toc="link.id"
        :data-text="link.label"
        :aria-current="link.id === activeId ? 'location' : undefined"
        @click="onLinkClick(link.id)"
      >
        {{ link.label }}
        <span v-if="link.isNew" class="toc-new" :aria-label="t('component.new')" />
      </a>
      <!-- Closed until you reach the section, then it splits open. -->
      <div
        v-if="link.children?.length"
        class="toc-children"
        :data-open="expanded(link) || undefined"
      >
        <div class="toc-children-clip">
          <div class="toc-children-list">
            <a
              v-for="child in link.children"
              :key="child.id"
              :href="`#${child.id}`"
              class="toc-link toc-child"
              :class="{ 'toc-link-active': child.id === activeId }"
              :data-toc="child.id"
              :data-text="child.label"
              :aria-current="child.id === activeId ? 'location' : undefined"
              :tabindex="expanded(link) ? undefined : -1"
              @click="onLinkClick(child.id)"
            >
              {{ child.label }}
            </a>
          </div>
        </div>
      </div>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { onMounted, onScopeDispose, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useResizeObserver } from '@vueuse/core'
import { animate, motionValue } from 'motion-v'

interface TocLink {
  id: string
  label: string
  /** A "new" dot beside it. */
  isNew?: boolean
  /** Shown under it while it or one of them is the current section. */
  children?: { id: string; label: string }[]
}
const props = defineProps<{ links: TocLink[] }>()
const route = useRoute()
const { t } = useI18n()

const activeId = shallowRef<string | null>(null)
const allLinks = () => props.links.flatMap((link) => [link, ...(link.children ?? [])])
const expanded = (link: TocLink) =>
  link.id === activeId.value || !!link.children?.some((child) => child.id === activeId.value)

// ─── The rail ────────────────────────────────────────────────────────────────

const RAIL_WIDTH = 40
const MAIN_X = 0.5
const BRANCH_X = 18.5
const CURVE = 14
const nav = useTemplateRef<HTMLElement>('nav')
const lit = useTemplateRef<SVGPathElement>('lit')
const railPath = shallowRef('')
const railHeight = shallowRef(0)

// Straight down the left, out along a curve to an open branch, down it, and back in at its end.
function draw() {
  const box = nav.value
  if (!box) return
  let d = `M${MAIN_X} 0`
  for (const branch of box.querySelectorAll<HTMLElement>('.toc-children')) {
    const top = branch.offsetTop
    const bottom = top + branch.offsetHeight
    // Closed, or still opening past the curves' own height: no branch yet.
    if (bottom - top < CURVE * 2 + 2) continue
    d += ` V${top} C${MAIN_X} ${top + CURVE * 0.6} ${BRANCH_X} ${top + CURVE * 0.4} ${BRANCH_X} ${top + CURVE}`
    d += ` V${bottom - CURVE} C${BRANCH_X} ${bottom - CURVE * 0.4} ${MAIN_X} ${bottom - CURVE * 0.6} ${MAIN_X} ${bottom}`
  }
  railPath.value = `${d} V${box.offsetHeight}`
  railHeight.value = box.offsetHeight
}

// The lit stretch: where it starts and ends along the path, each on its own spring, so it
// stretches toward where it's going and settles.
const LEAD = { type: 'spring', bounce: 0, duration: 0.3 } as const
const TRAIL = { type: 'spring', bounce: 0, duration: 0.5 } as const
const start = motionValue(0)
const end = motionValue(0)
let placed = false
function paint() {
  const path = lit.value
  if (!path) return
  const total = path.getTotalLength()
  path.style.strokeDasharray = `${Math.max(0, end.get() - start.get())} ${total + 1}`
  path.style.strokeDashoffset = `${-start.get()}`
}
const stops = [start.on('change', paint), end.on('change', paint)]
onScopeDispose(() => stops.forEach((stop) => stop()))

// How far along the path it reaches a given height: the path only ever goes down.
function lengthAt(path: SVGPathElement, y: number): number {
  let low = 0
  let high = path.getTotalLength()
  for (let i = 0; i < 18; i++) {
    const mid = (low + high) / 2
    if (path.getPointAtLength(mid).y < y) low = mid
    else high = mid
  }
  return high
}

function light() {
  const path = lit.value
  const box = nav.value
  const target = box?.querySelector<HTMLElement>(`[data-toc="${activeId.value}"]`)
  if (!path || !box || !target || !railPath.value) {
    path?.style.setProperty('opacity', '0')
    placed = false
    return
  }
  path.style.opacity = '1'
  const top = target.getBoundingClientRect().top - box.getBoundingClientRect().top
  const from = lengthAt(path, top)
  const to = lengthAt(path, top + target.offsetHeight)
  if (!placed || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    start.jump(from)
    end.jump(to)
    placed = true
    paint()
    return
  }
  const forward = from > start.get()
  animate(start, from, forward ? TRAIL : LEAD)
  animate(end, to, forward ? LEAD : TRAIL)
}

function refresh() {
  draw()
  // The path is in the DOM once Vue has patched `d`.
  requestAnimationFrame(light)
}
watch([activeId, () => props.links], () => requestAnimationFrame(refresh), { flush: 'post' })
// A branch opening or closing resizes the nav each frame, so the rail follows it there.
useResizeObserver(nav, refresh)

// ─── Which section you're in ────────────────────────────────────────────────

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
  refresh()
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
}

.toc-rail {
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
  pointer-events: none;
  fill: none;
}

.toc-rail-line {
  stroke: var(--ui-border);
  stroke-width: 1;
}

.toc-rail-lit {
  stroke: var(--ui-primary);
  stroke-width: 2;
  stroke-linecap: round;
  opacity: 0;
  transition: opacity 200ms var(--ui-ease-out);
}

.label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ui-text-muted);
  margin-bottom: 0.25rem;
}

/* Bold when current without re-wrapping: each link keeps room for its bold text. */
.toc-link {
  position: relative;
  display: inline-grid;
  align-self: flex-start;
  font-size: 0.85rem;
  color: var(--ui-text-muted);
  text-decoration: none;
  transition: color var(--ui-duration-press) var(--ui-ease-out);
}

.toc-link::after {
  content: attr(data-text);
  block-size: 0;
  overflow: hidden;
  visibility: hidden;
  font-weight: 600;
  pointer-events: none;
}

.toc-link:hover {
  color: var(--ui-text);
}

.toc-link-active {
  color: var(--ui-primary);
  font-weight: 600;
}

.toc-new {
  position: absolute;
  inset-inline-end: -0.7rem;
  inset-block-start: 0.45em;
  inline-size: 0.375rem;
  block-size: 0.375rem;
  border-radius: 50%;
  background: var(--ui-info);
}

/* Closed it takes no room at all; reached, it splits open. Rarely toggled, so it eases. */
.toc-children {
  display: grid;
  grid-template-rows: 0fr;
  margin-block: -0.25rem;
  transition: grid-template-rows 280ms var(--ui-ease-out);
}

.toc-children[data-open] {
  grid-template-rows: 1fr;
}

.toc-children-clip {
  min-block-size: 0;
  overflow: hidden;
}

.toc-children-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1.1rem 0 1.1rem 0.9rem;
  opacity: 0;
  transition: opacity 200ms var(--ui-ease-out);
}

.toc-children[data-open] .toc-children-list {
  opacity: 1;
}

.toc-child {
  font-size: 0.8rem;
  line-height: 1.35;
}

@media (prefers-reduced-motion: reduce) {
  .toc-children,
  .toc-children-list {
    transition: none;
  }
}

@media (max-width: 1100px) {
  .on-this-page {
    display: none;
  }
}
</style>
