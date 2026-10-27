<template>
  <span
    v-if="!wraps"
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    aria-hidden="true"
    v-bind="attrs"
  >
    <span v-if="$slots.default" class="ui-skeleton-content"><slot :loading="true" /></span>
  </span>
  <!-- With `loading`: your content, drawn as bones of itself while it loads. -->
  <div
    v-else
    ref="root"
    :class="groupPart.class"
    :style="groupPart.style"
    :aria-busy="loading || undefined"
    :data-loading="loading || undefined"
    :data-revealing="revealing || undefined"
    v-bind="attrs"
  >
    <div ref="content" class="ui-skeleton-group-content" :inert="loading || undefined">
      <slot :loading="!!loading" />
    </div>
    <div
      v-if="loading || bonesLeaving"
      class="ui-skeleton-bones"
      :data-leaving="bonesLeaving || undefined"
      aria-hidden="true"
    >
      <span
        v-for="(bone, index) in bones"
        :key="index"
        :class="bonePart.class"
        :style="[
          {
            insetInlineStart: `${bone.x}px`,
            insetBlockStart: `${bone.y}px`,
            inlineSize: `${bone.w}px`,
            blockSize: `${bone.h}px`,
            borderRadius: bone.radius,
          },
          bonePart.style,
        ]"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import './Skeleton.css'
import '../shared/tokens.css'
import '../../motion/timing.css'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { SkeletonMotion } from '../../motion/types'
import { prefersReducedMotion } from '../../composables/dom'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = withDefaults(
  defineProps<{
    /**
     * `'text'`: a `1em`-tall rounded line. `'circle'`: round, with `aspect-ratio: 1`. `'rect'`: `--ui-radius` corners; content or `ui.root` sets its size.
     * @default 'text'
     */
    variant?: 'text' | 'rect' | 'circle'
    /**
     * Wraps your content and draws it as bones of itself while `true`: each line of text a bar,
     * images, icons, avatars, buttons and fields blocks of their own shape, the rest (a card's
     * border and background) as it is. `false` brings the content in. Unset, it's one shape
     * (`variant`), as before.
     */
    loading?: boolean
    /** Shows the shimmer animation. @default true */
    animated?: boolean
    /** How it moves: its appearance (`{ initial: { root: { opacity: 0 } } }`). `false` turns its appearance and the pulse off. */
    motion?: SkeletonMotion
    /** Class and style overrides for each part. `bone` is each shape drawn while `loading`. */
    ui?: Partial<{ root: UiPartValue; bone: UiPartValue }>
  }>(),
  {
    variant: 'text',
    // Absent must read as unset: it's the single-shape skeleton then, not a loaded one.
    loading: undefined,
    animated: true,
    // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
    motion: undefined,
  },
)

defineSlots<{
  /** With `loading`, your content; render it with placeholder data while `loading` is `true`.
   * Without it, placeholder content that sizes the skeleton, rendered hidden. */
  default(props: { loading: boolean }): unknown
}>()

const wraps = computed(() => props.loading !== undefined)
const root = useTemplateRef<HTMLElement>('root')
const content = useTemplateRef<HTMLElement>('content')
const parts = useStateMotion({
  key: 'skeleton',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: { root: '.ui-skeleton' },
  states: () => ({}),
})
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.skeleton,
  () => props.ui,
)
const shimmer = computed(() => props.animated && props.motion !== false)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-skeleton',
    `ui-skeleton--${props.variant}`,
    shimmer.value && 'ui-skeleton--animated',
  ),
)
const groupPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-skeleton-group'))
const bonePart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.bone,
    'ui-skeleton',
    'ui-skeleton-bone',
    shimmer.value && 'ui-skeleton--animated',
  ),
)

// --- bones -------------------------------------------------------------------------------------

interface Bone {
  x: number
  y: number
  w: number
  h: number
  radius: string
}
const bones = shallowRef<Bone[]>([])
// Drawn as one block in their own shape, hidden underneath so their own fill can't show through.
// What's inside them (a button's label) isn't read again. Also vael-ui's own small pieces.
const BLOCKS = [
  'img, svg, video, canvas, picture, iframe, [role="img"]',
  'button, input, select, textarea, [data-skeleton-block]',
  '.ui-badge, .ui-tag, .ui-chip, .ui-avatar, .ui-kbd, .ui-switch, .ui-checkbox, .ui-radio',
  '.ui-progress, .ui-rating',
].join(', ')

/** Its corners, or, a wrapper with none of its own, those of a child that fills it (Avatar's frame). */
function cornersOf(el: Element, depth = 0): string {
  const own = getComputedStyle(el).borderRadius
  if ((own && !/^0px( 0px)*$/.test(own)) || depth > 2) return own || '0px'
  const box = el.getBoundingClientRect()
  for (const child of el.children) {
    const r = child.getBoundingClientRect()
    if (Math.abs(r.width - box.width) < 1 && Math.abs(r.height - box.height) < 1)
      return cornersOf(child, depth + 1)
  }
  return own || '0px'
}

/** Every shape the content draws, measured once: its blocks, then each line of its text. */
function measure(): Bone[] {
  const host = content.value
  const box = root.value?.getBoundingClientRect()
  if (!host || !box) return []
  const out: Bone[] = []
  const at = (rect: DOMRect | DOMRectReadOnly, radius: string, bar = false) => {
    if (rect.width < 1 || rect.height < 1) return
    // A line of text as a bar a little shorter than its line, so lines read apart.
    const inset = bar ? rect.height * 0.18 : 0
    out.push({
      x: rect.left - box.left,
      y: rect.top - box.top + inset,
      w: rect.width,
      h: rect.height - inset * 2,
      radius,
    })
  }
  for (const el of host.querySelectorAll<HTMLElement>(BLOCKS)) {
    // Inside a block already drawn (an icon in a button): that block covers it.
    if (el.parentElement?.closest(BLOCKS) && host.contains(el.parentElement.closest(BLOCKS)))
      continue
    at(el.getBoundingClientRect(), cornersOf(el))
  }
  const range = document.createRange()
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
  // One bar per line: pieces of text side by side on a line (a bold word) join up.
  const lines: DOMRect[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue
    const parent = node.parentElement
    if (!parent || parent.closest(BLOCKS)) continue
    range.selectNodeContents(node)
    for (const rect of range.getClientRects()) {
      if (rect.width < 1) continue
      const line = lines.find(
        (l) =>
          Math.abs(l.top - rect.top) < 2 && rect.left - l.right < 12 && l.left - rect.right < 12,
      )
      if (!line) lines.push(DOMRect.fromRect(rect))
      else {
        const left = Math.min(line.left, rect.left)
        const right = Math.max(line.right, rect.right)
        line.x = left
        line.width = right - left
        line.height = Math.max(line.height, rect.height)
      }
    }
  }
  for (const line of lines) at(line, 'calc(var(--ui-radius) - 4px)', true)
  return out
}

let frame = 0
function remeasure() {
  if (frame || !props.loading) return
  frame = requestAnimationFrame(() => {
    frame = 0
    if (props.loading) bones.value = measure()
  })
}
let resizes: ResizeObserver | undefined
let changes: MutationObserver | undefined
function watchContent() {
  stopWatching()
  const host = content.value
  if (!host || typeof ResizeObserver === 'undefined') return
  resizes = new ResizeObserver(remeasure)
  resizes.observe(host)
  changes = new MutationObserver(remeasure)
  changes.observe(host, { childList: true, subtree: true, characterData: true, attributes: true })
}
function stopWatching() {
  resizes?.disconnect()
  changes?.disconnect()
  resizes = changes = undefined
}

// --- reveal ------------------------------------------------------------------------------------

const revealing = shallowRef(false)
const bonesLeaving = shallowRef(false)
let settle: ReturnType<typeof setTimeout> | undefined
let runs: Animation[] = []

function token(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim()
}
function ms(value: string): number {
  if (!value) return 0
  return value.endsWith('ms') ? Number.parseFloat(value) : Number.parseFloat(value) * 1000
}

watch(
  () => props.loading,
  (loading, was) => {
    if (loading === undefined) return
    if (loading) {
      // Loading again: stop a reveal on its way and draw the bones over what's there.
      clearTimeout(settle)
      for (const run of runs) run.cancel()
      runs = []
      revealing.value = bonesLeaving.value = false
      void nextTick(() => {
        bones.value = measure()
        watchContent()
      })
      return
    }
    if (!was) return
    stopWatching()
    const el = root.value
    const off = props.motion === false || !el
    if (off) {
      bones.value = []
      return
    }
    // The content arrives as Editable's swap does: from 4px below with a touch of blur, its text
    // and media fading in while the bones fade out, and the box easing to the content's own size.
    const from = el.getBoundingClientRect().height
    revealing.value = true
    bonesLeaving.value = true
    void nextTick(() => {
      const enter = ms(token(el, '--ui-duration-enter'))
      const easing = token(el, '--ui-ease-out') || 'ease-out'
      const reduced = prefersReducedMotion()
      const to = el.getBoundingClientRect().height
      if (enter > 0 && !reduced && Math.abs(to - from) >= 0.5)
        runs.push(
          el.animate(
            [
              { blockSize: `${from}px`, overflow: 'clip' },
              { blockSize: `${to}px`, overflow: 'clip' },
            ],
            { duration: enter, easing },
          ),
        )
      if (enter > 0 && !reduced && content.value)
        runs.push(
          content.value.animate(
            [
              { translate: '0 4px', filter: 'blur(2px)' },
              { translate: '0 0', filter: 'blur(0)' },
            ],
            { duration: enter, easing },
          ),
        )
      settle = setTimeout(() => {
        revealing.value = bonesLeaving.value = false
        bones.value = []
        runs = []
      }, enter)
    })
  },
)

onMounted(() => {
  if (!props.loading) return
  bones.value = measure()
  watchContent()
})
onBeforeUnmount(() => {
  stopWatching()
  cancelAnimationFrame(frame)
  clearTimeout(settle)
})

defineExpose({
  /** Root element. */
  el: root,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
