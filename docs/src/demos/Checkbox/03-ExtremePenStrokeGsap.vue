<template>
  <section class="demo">
    <h3>Extreme: tasks check off with a pen stroke (GSAP)</h3>
    <p class="note">
      With <code>:motion="false"</code>, Checkbox leaves its transitions to you, and you animate the
      exposed <code>boxEl</code> and <code>checkEl</code>. Checking a task pops the box, draws the
      check like a pen stroke and strikes the task through with a few sparks. Unchecking fades the
      check out instead of erasing the stroke. “All done” checks every task, one after another.
    </p>
    <div class="tasks">
      <div :ref="(row) => trackRow(ALL, row)" class="task task--all">
        <Checkbox
          :ref="(box) => trackBox(ALL, box)"
          :model-value="allDone"
          :indeterminate="someDone"
          :motion="false"
          @update:model-value="toggleAll"
        >
          <span class="task-text">All done</span>
        </Checkbox>
        <span class="task-burst" aria-hidden="true">
          <span v-for="n in SPARKS" :key="n" class="task-spark" />
        </span>
      </div>
      <div v-for="task in tasks" :key="task.id" :ref="(row) => trackRow(task.id, row)" class="task">
        <Checkbox
          :ref="(box) => trackBox(task.id, box)"
          v-model="done"
          :value="task.id"
          :motion="false"
        >
          <span class="task-text">
            {{ task.label }}
            <span class="task-strike" aria-hidden="true" />
          </span>
        </Checkbox>
        <span class="task-burst" aria-hidden="true">
          <span v-for="n in SPARKS" :key="n" class="task-spark" />
        </span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onScopeDispose, shallowRef, watch } from 'vue'
import { gsap } from 'gsap'
import { Checkbox } from 'vael-ui'

const tasks = [
  { id: 'brief', label: 'Read the brief' },
  { id: 'draft', label: 'Draft the release notes' },
  { id: 'review', label: 'Ask for a review' },
  { id: 'ship', label: 'Ship it' },
]
const ALL = 'all'
const SPARKS = 6
const done = shallowRef<string[]>(['brief'])
const allDone = computed(() => done.value.length === tasks.length)
const someDone = computed(() => done.value.length > 0 && !allDone.value)
function toggleAll(checked: boolean | unknown[]) {
  done.value = checked === true ? tasks.map((task) => task.id) : []
}

type CheckboxHandle = { boxEl: HTMLElement | null; checkEl: SVGSVGElement | null }
const boxes = new Map<string, CheckboxHandle>()
const rows = new Map<string, HTMLElement>()
function trackBox(id: string, box: unknown) {
  if (box) boxes.set(id, box as CheckboxHandle)
  else boxes.delete(id)
}
function trackRow(id: string, row: unknown) {
  if (row instanceof HTMLElement) rows.set(id, row)
  else rows.delete(id)
}

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const running = new Map<string, gsap.core.Timeline>()
type Paint = { backgroundColor: string; borderColor: string }
const paintOf = (el: Element): Paint => {
  const style = getComputedStyle(el)
  return { backgroundColor: style.backgroundColor, borderColor: style.borderColor }
}

// Hands every element back to Checkbox's CSS, which already shows the resting state.
function release(id: string) {
  running.get(id)?.kill()
  running.delete(id)
  const box = boxes.get(id)
  const row = rows.get(id)
  if (!box?.boxEl || !row) return
  const targets = [
    box.boxEl,
    box.checkEl,
    box.checkEl?.querySelector('path'),
    ...row.querySelectorAll('.task-strike, .task-spark'),
  ].filter((el): el is Element => Boolean(el))
  gsap.set(targets, { clearProps: 'all' })
}

function sparks(row: HTMLElement, boxEl: HTMLElement, color: string, reach: number) {
  const rowRect = row.getBoundingClientRect()
  const boxRect = boxEl.getBoundingClientRect()
  const x = boxRect.left + boxRect.width / 2 - rowRect.left
  const y = boxRect.top + boxRect.height / 2 - rowRect.top
  const tl = gsap.timeline()
  row.querySelectorAll<HTMLElement>('.task-spark').forEach((spark, i) => {
    const angle = (i / SPARKS) * Math.PI * 2 - Math.PI / 2
    tl.fromTo(
      spark,
      { x, y, scale: 1, opacity: 1, backgroundColor: color },
      {
        x: x + Math.cos(angle) * reach,
        y: y + Math.sin(angle) * reach,
        scale: 0.2,
        opacity: 0,
        duration: 0.45,
        ease: 'power3.out',
      },
      0,
    )
  })
  return tl
}

// `from` is the box's paint before Vue flipped it, so the fill always starts from what was on screen.
function check(id: string, from: Paint, delay: number) {
  const box = boxes.get(id)
  const row = rows.get(id)
  if (!box?.boxEl || !box.checkEl || !row) return
  const path = box.checkEl.querySelector('path')
  const to = paintOf(box.boxEl)
  const strike = row.querySelector('.task-strike')
  // Starting state now, not on the first tick: Vue already drew the check, and a painted frame
  // would flash it before the stroke starts.
  gsap.set(box.boxEl, from)
  gsap.set(box.checkEl, { opacity: 0 })
  gsap.set(path, { strokeDashoffset: 16 })
  if (strike) gsap.set(strike, { scaleX: 0 })

  const tl = gsap.timeline({ delay, onComplete: () => release(id) })
  tl.to(box.boxEl, { ...to, duration: 0.16, ease: 'power2.out' }, 0)
  tl.fromTo(
    box.boxEl,
    { scale: 0.78 },
    { keyframes: { scale: [1.14, 1], easeEach: 'elastic.out(1, 0.45)' }, duration: 0.6 },
    0,
  )
  tl.set(box.checkEl, { opacity: 1 }, 0.06)
  tl.fromTo(
    box.checkEl,
    { scale: 0.6, rotation: -12 },
    { scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(3)' },
    0.06,
  )
  tl.to(path, { strokeDashoffset: 0, duration: 0.3, ease: 'power3.out' }, 0.08)
  if (strike) {
    tl.to(
      strike,
      { scaleX: 1, duration: 0.36, ease: 'power2.inOut', transformOrigin: 'left' },
      0.14,
    )
  }
  tl.add(sparks(row, box.boxEl, to.backgroundColor, id === ALL ? 22 : 14), 0.1)
  running.set(id, tl)
}

function uncheck(id: string, from: Paint) {
  const box = boxes.get(id)
  const row = rows.get(id)
  if (!box?.boxEl || !box.checkEl || !row) return
  const to = paintOf(box.boxEl)
  const strike = row.querySelector('.task-strike')
  gsap.set(box.boxEl, from)
  gsap.set(box.checkEl, { opacity: 1 })
  if (strike) gsap.set(strike, { scaleX: 1 })

  const tl = gsap.timeline({ onComplete: () => release(id) })
  // Never un-draws: running the stroke backwards reads as a rewind.
  tl.to(box.checkEl, { opacity: 0, scale: 0.8, duration: 0.14, ease: 'power1.out' }, 0)
  tl.to(box.boxEl, { ...to, duration: 0.18, ease: 'power2.out' }, 0)
  tl.fromTo(box.boxEl, { scale: 0.9 }, { scale: 1, duration: 0.35, ease: 'elastic.out(1, 0.5)' }, 0)
  if (strike) {
    tl.to(strike, { scaleX: 0, duration: 0.22, ease: 'power2.in', transformOrigin: 'right' }, 0)
  }
  running.set(id, tl)
}

// Runs before the DOM updates, so each box still shows what's on screen.
watch(done, async (next, prev) => {
  const added = next.filter((id) => !prev.includes(id))
  const removed = prev.filter((id) => !next.includes(id))
  const wasAll = prev.length === tasks.length
  const isAll = next.length === tasks.length
  const ids = [...added, ...removed, ...(wasAll !== isAll ? [ALL] : [])]
  const before = new Map<string, Paint>()
  for (const id of ids) {
    const boxEl = boxes.get(id)?.boxEl
    if (boxEl) before.set(id, paintOf(boxEl))
  }
  await nextTick()
  for (const id of ids) release(id)
  if (reduce()) return
  // A select-all cascades down the list; a single click starts at once.
  added.forEach((id, i) => check(id, before.get(id)!, added.length > 1 ? i * 0.06 : 0))
  removed.forEach((id) => uncheck(id, before.get(id)!))
  if (!wasAll && isAll) check(ALL, before.get(ALL)!, added.length > 1 ? added.length * 0.06 : 0.12)
  if (wasAll && !isAll) uncheck(ALL, before.get(ALL)!)
})

onScopeDispose(() => {
  for (const tl of running.values()) tl.kill()
})
</script>

<style scoped>
.tasks {
  display: grid;
  gap: 0.625rem;
  inline-size: fit-content;
  min-inline-size: 14rem;
}

.task {
  position: relative;
  inline-size: fit-content;
}

.task--all {
  inline-size: auto;
  padding-block-end: 0.625rem;
  margin-block-end: 0.125rem;
  border-block-end: 1px solid var(--ui-border);
  font-weight: 500;
}

.task-text {
  position: relative;
  transition: color 200ms ease;
}

.ui-checkbox[data-state='checked'] .task-text {
  color: var(--ui-text-muted);
}

/* Resting states live here; GSAP only animates between them. */
.task-strike {
  position: absolute;
  inset-inline: -0.125rem;
  inset-block-start: 55%;
  block-size: 1.5px;
  border-radius: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  pointer-events: none;
}

.ui-checkbox[data-state='checked'] .task-strike {
  transform: scaleX(1);
}

.task-burst {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.task-spark {
  position: absolute;
  inset-block-start: -2px;
  inset-inline-start: -2px;
  inline-size: 4px;
  block-size: 4px;
  border-radius: 999px;
  opacity: 0;
}
</style>
