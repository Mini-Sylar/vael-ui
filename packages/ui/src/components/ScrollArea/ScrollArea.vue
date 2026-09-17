<template>
  <div ref="root" :class="rootPart.class" :style="rootPart.style" v-bind="attrs">
    <div
      ref="viewport"
      :class="viewportPart.class"
      :style="viewportPart.style"
      v-scroll-mask="scrollMaskValue"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import './ScrollArea.css'
import '../shared/tokens.css'
import { computed, useAttrs, useTemplateRef } from 'vue'
import { useResizeObserver, useScroll } from '@vueuse/core'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { vScrollMask } from '../../directives/vScrollMask'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = withDefaults(
  defineProps<{
    orientation?: 'vertical' | 'horizontal' | 'both'
    /** Masks the scrolling edge(s) as content scrolls under them. */
    scrollFade?: boolean
    /** Scrollbar thumb is transparent until you hover/scroll the viewport (Chromium/WebKit only — `::-webkit-scrollbar-thumb` has no hover-reveal equivalent for Firefox's `scrollbar-color`, which always shows the thin thumb). */
    autoHide?: boolean
    ui?: Partial<{ root: UiPartValue; viewport: UiPartValue }>
  }>(),
  { orientation: 'vertical', scrollFade: true, autoHide: false },
)

const emit = defineEmits<{
  scroll: [event: Event]
}>()

defineSlots<{
  default(): unknown
}>()

const scrollMaskValue = computed(() => {
  if (!props.scrollFade) return false
  if (props.orientation === 'both') return 'both'
  return props.orientation === 'horizontal' ? 'x' : 'y'
})

const root = useTemplateRef<HTMLElement>('root')
const viewport = useTemplateRef<HTMLElement>('viewport')

// useScroll's own reactive arrived/direction/isScrolling state replaces this component's former
// hand-rolled scroll-position tracking. `isScrolling` in particular is what usePullToRefresh now
// reads to avoid arming a pull while a nested ScrollArea's own momentum/rubber-band scroll
// hasn't actually settled — a touchstart landing at scrollTop 0 mid-bounce used to arm
// regardless, since a raw scrollTop read can't tell "settled" from "still animating through 0."
const {
  x: scrollLeft,
  y: scrollTop,
  isScrolling,
  arrivedState,
  directions,
  measure,
} = useScroll(viewport, { onScroll: (event) => emit('scroll', event) })

const atTop = computed(() => arrivedState.top)
const atBottom = computed(() => arrivedState.bottom)
const atStart = computed(() => arrivedState.left)
const atEnd = computed(() => arrivedState.right)

// useScroll's own `observe` option (a MutationObserver, on by default) covers a DOM-mutation-
// driven size change; this additionally catches a pure layout/CSS size change with no DOM
// mutation (e.g. a height transition), so `measure()` never goes stale either way — same
// guarantee the old hand-rolled ResizeObserver gave, via useResizeObserver instead of a bespoke
// one (it already tracks the reactive `viewport` ref and disconnects on scope dispose).
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
  el: root,
  viewportEl: viewport,
  scrollTop,
  scrollLeft,
  atTop,
  atBottom,
  atStart,
  atEnd,
  /** True while a scroll (including native momentum/rubber-band settling) is in flight. */
  isScrolling,
  directions,
  scrollTo,
  scrollToTop,
  scrollToBottom,
  scrollToStart,
  scrollToEnd,
})
</script>
