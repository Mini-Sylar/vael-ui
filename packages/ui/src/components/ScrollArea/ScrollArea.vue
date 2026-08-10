<template>
  <div ref="root" :class="rootPart.class" :style="rootPart.style">
    <div
      ref="viewport"
      :class="viewportPart.class"
      :style="viewportPart.style"
      v-scroll-mask="scrollMaskValue"
      @scroll="onScroll"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import './ScrollArea.css'
import '../shared/tokens.css'
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { vScrollMask } from '../../directives/vScrollMask'

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

const scrollTop = shallowRef(0)
const scrollLeft = shallowRef(0)
const atTop = shallowRef(true)
const atBottom = shallowRef(true)
const atStart = shallowRef(true)
const atEnd = shallowRef(true)

function syncScrollState() {
  const el = viewport.value
  if (!el) return
  scrollTop.value = el.scrollTop
  scrollLeft.value = el.scrollLeft
  atTop.value = el.scrollTop <= 0
  atBottom.value = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
  atStart.value = el.scrollLeft <= 0
  atEnd.value = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
}

function onScroll(event: Event) {
  syncScrollState()
  emit('scroll', event)
}

let resizeObserver: ResizeObserver | undefined
watch(
  viewport,
  (el) => {
    resizeObserver?.disconnect()
    if (!el) return
    syncScrollState()
    resizeObserver = new ResizeObserver(syncScrollState)
    resizeObserver.observe(el)
  },
  { immediate: true },
)
onBeforeUnmount(() => resizeObserver?.disconnect())

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
  scrollTo,
  scrollToTop,
  scrollToBottom,
  scrollToStart,
  scrollToEnd,
})
</script>
