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
    <!-- The sidebar's dither, feathering out from the lit stretch toward its link. -->
    <span ref="litDither" class="toc-lit-dither" aria-hidden="true" />
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
// Open while you're in it, and already open as you come near, from above or below, so the
// indicator has somewhere to go when it gets there.
const near = shallowRef<ReadonlySet<string>>(new Set())
const expanded = (link: TocLink) =>
  link.id === activeId.value ||
  near.value.has(link.id) ||
  !!link.children?.some((child) => child.id === activeId.value)

// ─── The rail ────────────────────────────────────────────────────────────────

const RAIL_WIDTH = 40
const MAIN_X = 0.5
const BRANCH_X = 18.5
const CURVE = 14
const nav = useTemplateRef<HTMLElement>('nav')
const lit = useTemplateRef<SVGPathElement>('lit')
const litDither = useTemplateRef<HTMLElement>('litDither')
const railPath = shallowRef('')
const railHeight = shallowRef(0)

// Straight down the left, out along a curve to a branch, down it, and back in at its end. The
// branch grows with its list, so the path changes smoothly as a section opens or closes.
function draw() {
  const box = nav.value
  if (!box) return
  let d = `M${MAIN_X} 0`
  for (const branch of box.querySelectorAll<HTMLElement>('.toc-children')) {
    const top = branch.offsetTop
    const height = branch.offsetHeight
    if (height < 1) continue
    const bottom = top + height
    const out = Math.min(1, height / (CURVE * 2))
    const x = MAIN_X + (BRANCH_X - MAIN_X) * out
    const c = Math.min(CURVE, height / 2)
    d += ` V${top} C${MAIN_X} ${top + c * 0.6} ${x} ${top + c * 0.4} ${x} ${top + c}`
    d += ` V${bottom - c} C${x} ${bottom - c * 0.4} ${MAIN_X} ${bottom - c * 0.6} ${MAIN_X} ${bottom}`
  }
  railPath.value = `${d} V${box.offsetHeight}`
  railHeight.value = box.offsetHeight
}

// The lit stretch: its top and bottom edges, each on its own spring, so it stretches toward
// where it's going and settles. They're heights in the layout the list is heading for, once every
// branch has finished opening or closing: a branch opening above the stretch moves it with its
// link, instead of the stretch chasing a link that's still moving.
const PAD = 3
const LEAD = { type: 'spring', bounce: 0, duration: 0.3 } as const
const TRAIL = { type: 'spring', bounce: 0, duration: 0.5 } as const
const start = motionValue(0)
const end = motionValue(0)
const targets = new Map([
  [start, 0],
  [end, 0],
])
let placed = false

interface Branch {
  el: HTMLElement
  top: number
  height: number
  settled: number
}
function branches(box: HTMLElement): Branch[] {
  return [...box.querySelectorAll<HTMLElement>('.toc-children')].map((el) => ({
    el,
    top: el.offsetTop,
    height: el.offsetHeight,
    settled: el.hasAttribute('data-open')
      ? (el.querySelector<HTMLElement>('.toc-children-list')?.offsetHeight ?? 0)
      : 0,
  }))
}
// A settled height, where it's drawn right now.
function toCurrent(list: Branch[], y: number): number {
  let offset = 0
  for (const branch of list) {
    const top = branch.top + offset
    if (y <= top) break
    if (y < top + branch.settled) return branch.top + Math.min(y - top, branch.height)
    offset += branch.settled - branch.height
  }
  return y - offset
}
// Where a link will sit once every branch above it has settled.
function settledTop(list: Branch[], box: HTMLElement, link: HTMLElement): number {
  let y = link.getBoundingClientRect().top - box.getBoundingClientRect().top
  for (const branch of list) {
    if (branch.el.contains(link)) continue
    if (!(branch.el.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING)) continue
    y += branch.settled - branch.height
  }
  return y
}

// A branch just set off opening or closing: everything below it in the settled layout moves by
// its change, the stretch and where it's heading included, keeping its velocity.
const lastSettled = new WeakMap<HTMLElement, number>()
function reconcile(list: Branch[]) {
  let offset = 0
  for (const branch of list) {
    const before = lastSettled.get(branch.el) ?? branch.settled
    lastSettled.set(branch.el, branch.settled)
    const top = branch.top + offset
    offset += branch.settled - branch.height
    if (before === branch.settled) continue
    const move = (y: number) =>
      y >= top + before
        ? y + branch.settled - before
        : y > top
          ? top + Math.min(y - top, branch.settled)
          : y
    for (const [value, target] of targets) {
      targets.set(value, move(target))
      const moved = move(value.get())
      if (Math.abs(moved - value.get()) < 0.01) continue
      const velocity = value.getVelocity()
      const running = value.isAnimating()
      value.jump(moved)
      if (running)
        animate(value, targets.get(value)!, { ...(value === start ? TRAIL : LEAD), velocity })
    }
    goal = targets.get(start)!
  }
}

function paint() {
  const path = lit.value
  const box = nav.value
  if (!path || !box || !railPath.value) return
  const list = branches(box)
  reconcile(list)
  const total = path.getTotalLength()
  const from = lengthAt(path, toCurrent(list, start.get()))
  const to = lengthAt(path, toCurrent(list, end.get()))
  path.style.strokeDasharray = `${Math.max(0, to - from)} ${total + 1}`
  path.style.strokeDashoffset = `${-from}`
  const dither = litDither.value
  if (!dither) return
  const head = path.getPointAtLength(from)
  const tail = path.getPointAtLength(to)
  dither.style.translate = `${head.x + 1}px ${head.y}px`
  dither.style.blockSize = `${Math.max(0, tail.y - head.y)}px`
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

let litId: string | null = null
let goal = -1
function light() {
  const path = lit.value
  const box = nav.value
  const target = box?.querySelector<HTMLElement>(`[data-toc="${activeId.value}"]`)
  if (!path || !box || !target || !railPath.value) {
    path?.style.setProperty('opacity', '0')
    litDither.value?.style.setProperty('opacity', '0')
    placed = false
    return
  }
  path.style.opacity = '1'
  if (litDither.value) litDither.value.style.opacity = '1'
  const list = branches(box)
  reconcile(list)
  // A little past the link's line box, like the sidebar's bar on its row.
  const top = settledTop(list, box, target) - PAD
  const bottom = top + target.offsetHeight + PAD * 2
  if (!placed || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    start.jump(top)
    end.jump(bottom)
    targets.set(start, top).set(end, bottom)
    placed = true
    litId = activeId.value
    goal = top
    paint()
    return
  }
  // Already heading there: the rail redraws under it as branches move.
  if (litId === activeId.value && Math.abs(goal - top) < 0.5) return
  litId = activeId.value
  goal = top
  targets.set(start, top).set(end, bottom)
  const down = top > start.get()
  animate(start, top, down ? TRAIL : LEAD)
  animate(end, bottom, down ? LEAD : TRAIL)
}

function refresh() {
  draw()
  // The path is in the DOM once Vue has patched `d`.
  requestAnimationFrame(() => {
    paint()
    light()
  })
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
  const reach = window.innerHeight * 0.5
  const next = new Set<string>()
  for (const link of props.links) {
    if (!link.children?.length) continue
    const box = document.getElementById(link.id)?.closest('section')?.getBoundingClientRect()
    if (box && box.top < window.innerHeight + reach && box.bottom > -reach) next.add(link.id)
  }
  if (next.size !== near.value.size || [...next].some((id) => !near.value.has(id)))
    near.value = next
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

.toc-lit-dither {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  inline-size: 1.1rem;
  background: radial-gradient(circle, var(--ui-primary) 0.6px, transparent 0.9px) 0 0 / 3px 3px;
  opacity: 0;
  mask-image: linear-gradient(to right, rgb(0 0 0 / 0.85), transparent);
  pointer-events: none;
  transition: opacity 200ms var(--ui-ease-out);
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
  background: var(--docs-accent, var(--ui-info));
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
