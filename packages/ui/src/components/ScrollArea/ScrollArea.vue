<template>
  <div ref="root" :class="rootPart.class" :style="rootPart.style" v-bind="rootAttrs()">
    <div
      ref="viewport"
      :class="viewportPart.class"
      :style="viewportPart.style"
      :role="attrs['aria-label'] || attrs['aria-labelledby'] ? 'region' : undefined"
      v-bind="nameAttrs()"
      :data-scrolling="thumbRevealed ? '' : undefined"
      v-scroll-mask="scrollMaskValue"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import './ScrollArea.css'
import '../shared/tokens.css'
import '../../motion/timing.css'
import { computed, onScopeDispose, shallowRef, useAttrs, useTemplateRef } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { useScrollState } from '../../composables/useScrollState'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { vScrollMask } from '../../directives/vScrollMask'
import { useFocusableScroller } from '../../composables/useFocusableScroller'
import { useStateMotion } from '../../motion/useStateMotion'
import type { ScrollAreaMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
// The name goes where the focus goes: the viewport, a region once named. Read each render: attrs aren't reactive.
const isNameAttr = (key: string) => key === 'aria-label' || key === 'aria-labelledby'
const rootAttrs = () =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !isNameAttr(key)))
const nameAttrs = () => Object.fromEntries(Object.entries(attrs).filter(([key]) => isNameAttr(key)))
const props = withDefaults(
  defineProps<{
    /** Which axis (or axes) the viewport scrolls along. @default 'vertical' */
    orientation?: 'vertical' | 'horizontal' | 'both'
    /** Masks the scrolling edge(s) as content scrolls under them. @default true */
    scrollFade?: boolean
    /**
     * Hides the scrollbar thumb until you hover, focus or scroll the viewport.
     * @default false
     */
    autoHide?: boolean
    /** How it moves: its appearance (`{ initial: { root: { opacity: 0, y: 4 } } }`). `false` turns its own animation off. */
    motion?: ScrollAreaMotion
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue; viewport: UiPartValue }>
  }>(),
  // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
  { orientation: 'vertical', scrollFade: true, autoHide: false, motion: undefined },
)

const emit = defineEmits<{
  /** Fires when the viewport scrolls. */
  scroll: [event: Event]
}>()

defineSlots<{
  /** Scrollable content. */
  default(): unknown
}>()

const scrollMaskValue = computed(() => {
  if (!props.scrollFade) return false
  if (props.orientation === 'both') return 'both'
  return props.orientation === 'horizontal' ? 'x' : 'y'
})

const root = useTemplateRef<HTMLElement>('root')
const viewport = useTemplateRef<HTMLElement>('viewport')
useFocusableScroller(viewport)
// The scrollbar is the viewport's native one: no element of its own to animate.
const parts = useStateMotion({
  key: 'scrollArea',
  mainPart: 'root',
  motion: () => props.motion,
  parts: () => ({ root: root.value }),
  states: () => ({}),
})

// autoHide keeps the thumb shown for a moment after the last scroll event, like
// an overlay scrollbar. Not `isScrolling`: an instant scroll fires scrollend in the
// same frame, so the thumb would never paint.
const THUMB_LINGER_MS = 800
const thumbRevealed = shallowRef(false)
let thumbTimer: ReturnType<typeof setTimeout> | undefined
function onScroll(event: Event) {
  emit('scroll', event)
  if (!props.autoHide) return
  thumbRevealed.value = true
  clearTimeout(thumbTimer)
  thumbTimer = setTimeout(() => (thumbRevealed.value = false), THUMB_LINGER_MS)
}
onScopeDispose(() => clearTimeout(thumbTimer))

const {
  x: scrollLeft,
  y: scrollTop,
  isScrolling,
  arrivedState,
  directions,
  measure,
} = useScrollState(viewport, onScroll)

const atTop = computed(() => arrivedState.top)
const atBottom = computed(() => arrivedState.bottom)
const atStart = computed(() => arrivedState.left)
const atEnd = computed(() => arrivedState.right)

// A size change with no scroll (a height transition, new content) moves the edges too.
useResizeObserver(viewport, () => measure())

function scrollTo(options: ScrollToOptions) {
  viewport.value?.scrollTo(options)
}
function scrollToTop(options?: Omit<ScrollToOptions, 'top'>) {
  viewport.value?.scrollTo({ top: 0, behavior: 'smooth', ...options })
}
function scrollToBottom(options?: Omit<ScrollToOptions, 'top'>) {
  const el = viewport.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: 'smooth', ...options })
}
function scrollToStart(options?: Omit<ScrollToOptions, 'left'>) {
  viewport.value?.scrollTo({ left: 0, behavior: 'smooth', ...options })
}
function scrollToEnd(options?: Omit<ScrollToOptions, 'left'>) {
  const el = viewport.value
  if (!el) return
  el.scrollTo({ left: el.scrollWidth, behavior: 'smooth', ...options })
}

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.scrollArea,
  () => props.ui,
)
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-scroll-area'))
const viewportPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.viewport,
    'ui-scroll-area-viewport',
    `ui-scroll-area-viewport--${props.orientation}`,
    props.autoHide && 'ui-scroll-area-viewport--auto-hide',
  ),
)

defineExpose({
  /** Root element. */
  el: root,
  /** Scrolling viewport element. */
  viewportEl: viewport,
  /** Vertical scroll offset in pixels. Writable: assigning it scrolls the viewport. */
  scrollTop,
  /** Horizontal scroll offset in pixels. Writable: assigning it scrolls the viewport. */
  scrollLeft,
  /** Whether the viewport is scrolled to the top. */
  atTop,
  /** Whether the viewport is scrolled to the bottom. */
  atBottom,
  /** Whether the viewport is scrolled to the left edge. */
  atStart,
  /** Whether the viewport is scrolled to the right edge. */
  atEnd,
  /** `true` while a scroll is in progress, including native momentum or rubber-band settling. */
  isScrolling,
  /** Direction of the current scroll, as `top`, `bottom`, `left` and `right` flags. */
  directions,
  /** Scrolls the viewport with native `ScrollToOptions`. */
  scrollTo,
  /** Smooth-scrolls to the top. */
  scrollToTop,
  /** Smooth-scrolls to the bottom. */
  scrollToBottom,
  /** Smooth-scrolls to the left edge. */
  scrollToStart,
  /** Smooth-scrolls to the right edge. */
  scrollToEnd,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
