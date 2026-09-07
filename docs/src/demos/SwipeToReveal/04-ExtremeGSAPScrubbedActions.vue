<template>
  <section class="demo">
    <h3>Extreme: gesture-scrubbed GSAP timeline for the actions (gsap)</h3>
    <p class="note">
      The panel's <code>progress</code> slot prop (0 → 1 as the edge is revealed) scrubs a paused
      GSAP timeline, so the buttons cartwheel in <em>with</em> your finger and reverse when you drag
      back. On release the library owns the settle — the timeline just eases to the same endpoint.
      No internal classes touched; <code>:reveal-scale="false"</code> hands the panel to GSAP.
    </p>
    <ul class="swipe-list">
      <li v-for="row in rows" :key="row.id" class="swipe-row">
        <SwipeToReveal
          :ref="(el) => setRowRef(row.id, el)"
          v-model:open="openState[row.id]"
          :reveal-scale="false"
        >
          <template #trailing-actions="{ close }">
            <div class="gsap-actions">
              <button
                v-for="action in actions"
                :key="action.label"
                :ref="(el) => setActionRef(row.id, action.label, el as HTMLElement | null)"
                type="button"
                class="gsap-action"
                :class="`gsap-action--${action.tone}`"
                @click="close"
              >
                <component :is="action.icon" :size="18" weight="bold" />
                <span>{{ action.label }}</span>
              </button>
            </div>
          </template>

          <div class="swipe-content">
            <Avatar :name="row.from" size="sm" />
            <div class="swipe-body">
              <strong>{{ row.from }}</strong>
              <p class="note swipe-preview">{{ row.preview }}</p>
            </div>
          </div>
        </SwipeToReveal>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, reactive, watch } from 'vue'
import { gsap } from 'gsap'
import { Avatar, SwipeToReveal } from 'vael-ui'
import { PhArchiveBox, PhPushPin, PhTrash } from '@phosphor-icons/vue'

type SwipeInstance = InstanceType<typeof SwipeToReveal>

const rows = [
  { id: 'a', from: 'Priya Nair', preview: 'Swipe slowly — the buttons track the gesture.' },
  { id: 'b', from: 'Marcus Lee', preview: 'Let go early and the timeline rewinds itself.' },
]
const actions = [
  { label: 'Archive', tone: 'muted', icon: PhArchiveBox },
  { label: 'Pin', tone: 'accent', icon: PhPushPin },
  { label: 'Delete', tone: 'danger', icon: PhTrash },
] as const

const openState = reactive<Record<string, boolean>>({})
const rowRefs = new Map<string, SwipeInstance>()
const actionEls = new Map<string, HTMLElement[]>()
const timelines = new Map<string, gsap.core.Timeline>()
const stops: Array<() => void> = []

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function setActionRef(rowId: string, label: string, el: HTMLElement | null) {
  const list = actionEls.get(rowId) ?? []
  const i = actions.findIndex((a) => a.label === label)
  if (el) list[i] = el
  actionEls.set(rowId, list)
}

function buildTimeline(rowId: string) {
  const els = (actionEls.get(rowId) ?? []).filter(Boolean)
  if (els.length === 0) return
  const tl = gsap.timeline({ paused: true })
  tl.from(els, {
    xPercent: 120,
    rotateZ: -35,
    scale: 0.2,
    opacity: 0,
    transformOrigin: '50% 50%',
    stagger: 0.14,
    ease: 'back.out(2.2)',
    duration: 1,
  })
  timelines.set(rowId, tl)
}

function setRowRef(rowId: string, el: unknown) {
  const inst = (el as SwipeInstance | null) ?? null
  if (!inst) {
    rowRefs.delete(rowId)
    return
  }
  if (rowRefs.has(rowId)) return
  rowRefs.set(rowId, inst)

  if (prefersReducedMotion()) return
  buildTimeline(rowId)

  const stop = watch(
    () => [inst.trailingProgress, inst.isDragging] as const,
    ([progress, dragging]) => {
      const tl = timelines.get(rowId)
      if (!tl) return
      const p = Math.min(1, Math.max(0, progress))
      if (dragging) tl.progress(p)
      else gsap.to(tl, { progress: p, duration: 0.2, ease: 'power3.out', overwrite: true })
    },
    { flush: 'post' },
  )
  stops.push(stop)
}

onBeforeUnmount(() => {
  stops.forEach((stop) => stop())
  timelines.forEach((tl) => tl.kill())
})
</script>

<style scoped>
.swipe-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-inline-size: 28rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  overflow: hidden;
}
.swipe-row + .swipe-row {
  border-block-start: 1px solid var(--ui-border);
}
.swipe-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--ui-surface);
}
.swipe-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-inline-size: 0;
  flex: 1;
}
.swipe-preview {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gsap-actions {
  display: flex;
  block-size: 100%;
}
.gsap-action {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  inline-size: 5rem;
  border: 0;
  font: inherit;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
}
.gsap-action--muted {
  background: var(--ui-text-muted);
}
.gsap-action--accent {
  background: var(--ui-info);
}
.gsap-action--danger {
  background: var(--ui-danger);
}
</style>
