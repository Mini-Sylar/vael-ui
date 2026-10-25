<!-- A component's anatomy, for styling and filling it: every part faintly outlined on the stage;
     the part or slot you point at (or pick from the list) highlighted and named, with the `ui` key
     or the template that reaches it ready to copy. The outlines are drawn on a layer above the
     page, so a panel the component opened is covered too. -->
<template>
  <div v-if="shown" v-animate.rise class="anatomy-panel">
    <div
      v-for="row in rows"
      :key="row.title"
      class="anatomy-row"
      role="group"
      :aria-label="row.title"
    >
      <span class="anatomy-row-title">{{ row.title }}</span>
      <button
        v-for="entry in row.entries"
        :key="entry.key"
        type="button"
        class="anatomy-chip"
        :aria-pressed="selected === entry.key"
        :data-active="active === entry.key || undefined"
        :data-absent="!entry.count || undefined"
        :title="entry.count ? undefined : 'Not in this example'"
        @pointerenter="hovered = entry.key"
        @pointerleave="hovered = null"
        @focus="hovered = entry.key"
        @blur="hovered = null"
        @click="selected = entry.key"
      >
        {{ entry.label }}
        <span v-if="entry.count > 1" class="anatomy-muted">×{{ entry.count }}</span>
      </button>
    </div>
    <!-- Two fixed lines, so pointing at another entry never moves the list under the pointer. -->
    <div class="anatomy-readout">
      <template v-if="current">
        <div class="anatomy-readout-line">
          <code class="anatomy-snippet">
            <template v-if="current.kind === 'part'">
              <span class="anatomy-muted">&lt;{{ current.owner }}</span> {{ snippet }}
              <span class="anatomy-muted">/&gt;</span>
            </template>
            <template v-else>
              <span class="anatomy-muted">&lt;{{ current.owner }}&gt;</span> {{ snippet }}
            </template>
          </code>
          <Button variant="ghost" size="sm" class="anatomy-copy" @click="copy">
            <template #leading>
              <PhCheck v-if="copied" :size="13" aria-hidden="true" />
              <PhCopy v-else :size="13" aria-hidden="true" />
            </template>
            {{ copied ? 'Copied' : 'Copy' }}
          </Button>
        </div>
        <p class="anatomy-readout-line anatomy-muted" :title="detail">{{ detail }}</p>
      </template>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="shown"
      class="anatomy"
      :data-active="active ? '' : undefined"
      :style="accent"
      aria-hidden="true"
    >
      <svg class="anatomy-lines">
        <g v-for="mark in outlines" :key="mark.key" v-animate:outlines="REVEAL">
          <rect
            v-for="(box, i) in mark.boxes"
            :key="i"
            class="anatomy-box"
            v-bind="padded(box)"
            rx="4"
          />
        </g>
        <!-- The active one, drawn last over a halo in the page's color, so it reads on dark parts. -->
        <g v-if="activeMark" class="on">
          <template v-for="(box, i) in activeMark.boxes" :key="i">
            <rect class="anatomy-halo" v-bind="padded(box)" rx="4" />
            <rect class="anatomy-box" v-bind="padded(box)" rx="4" />
          </template>
        </g>
      </svg>
      <span
        v-if="tag"
        class="anatomy-tag"
        :data-below="tag.below || undefined"
        :style="{ left: `${tag.x}px`, top: `${tag.y}px` }"
      >
        {{ tag.name }}
      </span>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { Button } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'
import { PhCheck, PhCopy } from '@phosphor-icons/vue'
import type { Part, Slot } from '../anatomyOf'

const props = defineProps<{
  /** The live component's stage: its parts are found inside it, and in a panel it opened. */
  root: HTMLElement
  /** The component shown. */
  component: string
  /** Its parts and its pieces' parts. */
  parts: Part[]
  /** Its slots and its pieces' slots. */
  slots: Slot[]
  /** Inspecting: outlines on, the lists shown. */
  shown: boolean
}>()

interface Box {
  x: number
  y: number
  w: number
  h: number
}
type Entry =
  | (Part & { kind: 'part'; key: string; label: string })
  | (Slot & { kind: 'slot'; key: string; label: string })
interface Mark {
  key: string
  boxes: Box[]
  /** Which of its classes are on the page: a part can be in several places. */
  classes: string[]
}

// How far outside a part its outline runs, so it shows on dark parts too.
const PAD = 3
const TAG_HEIGHT = 20
// Outlines fade on together, a beat apart, when you turn it on; hovering is instant.
const REVEAL = { initial: { opacity: 0 }, stagger: true, duration: 200, easing: 'out' }

const marks = shallowRef<Mark[]>([])
const hovered = shallowRef<string | null>(null)
const selected = shallowRef<string | null>(null)
const copied = shallowRef(false)
// The app's color, read off the stage: the layer is outside the app, so it doesn't inherit it.
const accent = shallowRef<Record<string, string>>({})

// A piece's parts and slots are named for it: AccordionItem's header is `Item.header`.
const pieceOf = (owner: string) =>
  owner === props.component ? '' : `${owner.replace(props.component, '')}.`
const entries = computed((): Entry[] => [
  ...props.parts.map((part) => ({
    ...part,
    kind: 'part' as const,
    key: `${part.owner}:${part.classes.join(' ')}`,
    label: pieceOf(part.owner) + part.names.join(' / '),
  })),
  ...props.slots.map((slot) => ({
    ...slot,
    kind: 'slot' as const,
    key: `${slot.owner}#${slot.name}`,
    label: `${pieceOf(slot.owner)}#${slot.name}`,
  })),
])
const byKey = computed(() => new Map(entries.value.map((e) => [e.key, e])))
// Each class's part, for finding the part under the pointer.
const byClass = computed(() => {
  const out = new Map<string, string>()
  for (const e of entries.value)
    if (e.kind === 'part') for (const cls of e.classes) out.set(cls, e.key)
  return out
})
// Each kind on the stage in page order, then the ones this example doesn't render.
const rows = computed(() => {
  const count = new Map(marks.value.map((m) => [m.key, m.boxes.length]))
  const of = (kind: Entry['kind']) => {
    const present = marks.value
      .map((m) => byKey.value.get(m.key)!)
      .filter((e) => e.kind === kind)
      .map((e) => ({ ...e, count: count.get(e.key)! }))
    const absent = entries.value
      .filter((e) => e.kind === kind && !count.has(e.key))
      .map((e) => ({ ...e, count: 0 }))
    return [...present, ...absent]
  }
  return [
    { title: 'Parts', entries: of('part') },
    { title: 'Slots', entries: of('slot') },
  ].filter((row) => row.entries.length)
})
const outlines = computed(() => marks.value.filter((m) => byKey.value.get(m.key)?.kind === 'part'))
const active = computed(() => hovered.value ?? selected.value)
const activeMark = computed(() => marks.value.find((m) => m.key === active.value))
const current = computed(() => (active.value ? byKey.value.get(active.value) : undefined))
// The second line: a slot's description, or a part's classes and the slot it holds.
const detail = computed(() => {
  const e = current.value
  if (!e) return ''
  if (e.kind === 'slot') return e.description
  const classes = (activeMark.value?.classes ?? e.classes).map((c) => `.${c}`).join(' ')
  return e.slots.length ? `${classes} · holds #${e.slots[0]}` : classes
})
const snippet = computed(() => {
  const e = current.value
  if (!e) return ''
  return e.kind === 'part' ? `:ui="{ ${e.names[0]}: '' }"` : `<template #${e.name}></template>`
})

// Its name on the outline's top edge, or under it when there's no room above.
const tag = computed(() => {
  const mark = activeMark.value
  const box = mark?.boxes[0]
  if (!mark || !box) return null
  const below = box.y - PAD - TAG_HEIGHT < 4
  const x = Math.min(Math.max(box.x - PAD, 4), window.innerWidth - 160)
  const count = mark.boxes.length > 1 ? ` ×${mark.boxes.length}` : ''
  return {
    name: byKey.value.get(mark.key)!.label + count,
    below,
    x,
    y: below ? box.y + box.h + PAD : box.y - PAD,
  }
})

const padded = (box: Box) => ({
  x: box.x - PAD,
  y: box.y - PAD,
  width: box.w + PAD * 2,
  height: box.h + PAD * 2,
})
const boxOf = (el: Element): Box => {
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, w: r.width, h: r.height }
}
// The part of a box inside another; null when none of it is.
function within(box: Box, clip: Box): Box | null {
  const x = Math.max(box.x, clip.x)
  const y = Math.max(box.y, clip.y)
  const w = Math.min(box.x + box.w, clip.x + clip.w) - x
  const h = Math.min(box.y + box.h, clip.y + clip.h) - y
  return w > 0 && h > 0 ? { x, y, w, h } : null
}
// What you can see of it: cut by every box that clips it, the stage's scrollport included; none
// when it or a box around it is transparent (a button's idle loader).
function seen(el: HTMLElement): Box | null {
  if (getComputedStyle(el).opacity === '0') return null
  let box: Box | null = boxOf(el)
  for (let up = el.parentElement; box && up && up !== document.body; up = up.parentElement) {
    const style = getComputedStyle(up)
    if (style.opacity === '0') return null
    if (
      style.overflowX !== 'visible' ||
      style.overflowY !== 'visible' ||
      /paint|strict|content/.test(style.contain)
    )
      box = within(box, boxOf(up))
  }
  return box
}

// Panels the docs' own controls opened (a toolbar button's tooltip), by the ids they point to.
function chrome(): Element[] {
  const out: Element[] = []
  for (const el of document.querySelectorAll('#app [aria-describedby], #app [aria-controls]'))
    if (!props.root.contains(el))
      for (const id of `${el.getAttribute('aria-describedby') ?? ''} ${el.getAttribute('aria-controls') ?? ''}`.split(
        /\s+/,
      )) {
        const panel = id && document.getElementById(id)
        if (panel) out.push(panel)
      }
  return out
}
const opened = (el: Element, docs: Element[]) =>
  !el.closest('#app') && !docs.some((panel) => panel.contains(el) || el.contains(panel))

// Its parts: on the stage, or in a panel it opened (teleported out of the docs app). Never the
// docs' own chrome, which is built from these components too, and never a copy kept hidden.
function find(): Mark[] {
  const docs = chrome()
  const out: (Mark & { first: HTMLElement })[] = []
  for (const e of entries.value) {
    if (!e.classes.length) continue
    const els = [...document.querySelectorAll<HTMLElement>(e.classes.map((c) => `.${c}`).join())]
      .filter((el) => !el.closest('.anatomy') && (props.root.contains(el) || opened(el, docs)))
      .filter((el) => getComputedStyle(el).visibility !== 'hidden')
    const boxes = els.map(seen).filter((b): b is Box => !!b)
    const classes = e.classes.filter((c) => els.some((el) => el.classList.contains(c)))
    if (boxes.length) out.push({ key: e.key, boxes, classes, first: els[0]! })
  }
  return out
    .sort((a, b) =>
      a.first.compareDocumentPosition(b.first) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    )
    .map(({ first: _, ...mark }) => mark)
}

// Followed every frame while shown: the component is live, the page scrolls, a panel opens.
let raf = 0
let last = ''
function follow() {
  raf = requestAnimationFrame(follow)
  if (!props.shown) return
  const style = getComputedStyle(props.root)
  const primary = style.getPropertyValue('--ui-primary').trim()
  if (primary !== accent.value['--accent'])
    accent.value = {
      '--accent': primary,
      '--accent-contrast': style.getPropertyValue('--ui-primary-contrast').trim(),
    }
  const next = find()
  const key = JSON.stringify(next)
  if (key === last) return
  last = key
  marks.value = next
  // Starts on the first part, the component's root, so the readout is never empty.
  if (!selected.value || !byKey.value.has(selected.value))
    selected.value = outlines.value[0]?.key ?? next[0]?.key ?? null
}

// Pointing at the component itself names the innermost part under the pointer.
function point(event: PointerEvent) {
  if (!props.shown || (event.target as Element).closest?.('.anatomy-panel')) return
  for (let el = event.target as Element | null; el; el = el.parentElement)
    for (const cls of el.classList) {
      const key = byClass.value.get(cls)
      if (key) return void (hovered.value = key)
    }
  hovered.value = null
}

let copiedTimer: ReturnType<typeof setTimeout> | undefined
async function copy() {
  try {
    await navigator.clipboard.writeText(snippet.value)
  } catch {
    return
  }
  copied.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => (copied.value = false), 1500)
}

watch(
  () => [props.shown, props.component] as const,
  () => {
    hovered.value = null
    selected.value = null
    copied.value = false
    last = ''
    marks.value = []
  },
)
onMounted(() => {
  follow()
  document.addEventListener('pointerover', point)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearTimeout(copiedTimer)
  document.removeEventListener('pointerover', point)
})
</script>

<style scoped>
.anatomy-panel {
  display: grid;
  gap: 0.5rem;
  inline-size: 100%;
  padding-block-start: 0.75rem;
  border-block-start: 1px solid var(--ui-border);
  font:
    500 0.75rem/1.4 ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace;
}
.anatomy-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
}
.anatomy-row-title {
  min-inline-size: 3rem;
  color: var(--ui-text-muted);
  font-family: inherit;
}
.anatomy-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  background: var(--ui-surface);
  color: var(--ui-text-muted);
  font: inherit;
  cursor: pointer;
  transition:
    border-color 120ms var(--ui-ease-out),
    color 120ms var(--ui-ease-out);
}
.anatomy-chip[data-active] {
  border-color: var(--ui-primary);
  color: var(--ui-text);
}
/* The one you picked stays filled in the app's color; the one you point at is outlined. */
.anatomy-chip[aria-pressed='true'] {
  border-color: var(--ui-primary);
  background: var(--ui-primary);
  color: var(--ui-primary-contrast);
}
.anatomy-chip[aria-pressed='true'] .anatomy-muted {
  color: inherit;
  opacity: 0.7;
}
.anatomy-chip[data-absent] {
  border-style: dashed;
  opacity: 0.6;
}
.anatomy-chip:focus-visible {
  outline: 2px solid var(--ui-ring, var(--ui-primary));
  outline-offset: 1px;
}
.anatomy-readout {
  display: grid;
  grid-template-rows: 1.75rem 1.25rem;
  color: var(--ui-text);
}
.anatomy-readout-line {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-inline-size: 0;
  margin: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
p.anatomy-readout-line {
  display: block;
  line-height: 1.25rem;
}
.anatomy-snippet {
  font: inherit;
  font-size: 0.8125rem;
}
.anatomy-copy {
  margin-inline-start: -0.5rem;
}
.anatomy-muted {
  color: var(--ui-text-muted);
}

/* Drawn like a spec sheet: hairlines and dashes in one ink; the active part in the app's color. */
.anatomy {
  --ink: var(--ui-text);
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  pointer-events: none;
}
.anatomy-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.anatomy-halo {
  fill: none;
  stroke: var(--ui-surface);
  stroke-width: 3;
  opacity: 0.85;
}
.anatomy-box {
  fill: transparent;
  stroke: var(--ink);
  stroke-width: 1;
  stroke-dasharray: 4 3;
  opacity: 0.35;
}
.anatomy[data-active] g:not(.on) .anatomy-box {
  opacity: 0.18;
}
g.on .anatomy-box {
  stroke: var(--accent, var(--ink));
  stroke-width: 1.5;
  stroke-dasharray: none;
  opacity: 1;
  fill: color-mix(in oklab, var(--accent, var(--ink)) 8%, transparent);
}
.anatomy-tag {
  position: absolute;
  padding: 0.0625rem 0.375rem;
  border-radius: 4px;
  background: var(--accent, var(--ink));
  color: var(--accent-contrast, var(--ui-surface));
  font:
    500 0.6875rem/1.45 ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace;
  white-space: nowrap;
  translate: 0 -100%;
}
.anatomy-tag[data-below] {
  translate: 0 0;
}
</style>
