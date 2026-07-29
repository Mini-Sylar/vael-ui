<template>
  <div ref="root" :class="rootPart.class" :style="rootPart.style" :data-state="state">
    <div
      ref="zoneEl"
      :class="zonePart.class"
      :style="[zoneStyle, zonePart.style]"
      :data-state="state"
      aria-hidden="true"
    >
      <div :class="indicatorPart.class" :style="indicatorPart.style">
        <slot name="indicator" :state="state" :progress="progress" :pull-distance="pullDistance">
          <div :class="bubblePart.class" :style="[bubbleStyle, bubblePart.style]">
            <svg
              v-if="state === 'idle' || state === 'pulling' || state === 'ready'"
              class="ui-pull-to-refresh-arrow"
              :style="arrowStyle"
              viewBox="0 0 16 16"
              width="16"
              height="16"
              aria-hidden="true"
              fill="none"
            >
              <path
                d="M8 2v10M3.5 8L8 12.5L12.5 8"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span v-else-if="state === 'loading'" class="ui-loader" aria-hidden="true" />
            <svg v-else viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none">
              <path
                d="M3 8.5l3.5 3.5L13 5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <span :class="labelPart.class" :style="labelPart.style">{{ labelText }}</span>
        </slot>
      </div>
    </div>
    <slot />
  </div>
</template>

<script lang="ts">
import type { UiPartValue } from '../classes'

export interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  threshold?: number
  maxPull?: number
  /** Detects gestures on this element instead of the root. Defaults to the root. */
  scrollEl?: HTMLElement | { el: HTMLElement | null } | null
  ui?: Partial<{
    root: UiPartValue
    zone: UiPartValue
    indicator: UiPartValue
    bubble: UiPartValue
    label: UiPartValue
  }>
}
</script>

<!-- Custom #indicator animations go inside slot content, not zone (which owns block-size state) -->
<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { usePullToRefresh } from '../composables/usePullToRefresh'
import type { PullToRefreshState } from '../composables/usePullToRefresh'
import { useUiMessages } from '../messages'
import { useClassMerge, resolveUiPart } from '../classes'
import { useThemedUi } from '../theme'

const props = defineProps<PullToRefreshProps>()

defineSlots<{
  default(): unknown
  indicator(props: { state: PullToRefreshState; progress: number; pullDistance: number }): unknown
}>()

function unwrapEl(el: unknown): HTMLElement | null {
  if (!el) return null
  if (el instanceof HTMLElement) return el
  if (typeof el === 'object' && 'el' in el) return (el as { el: HTMLElement | null }).el ?? null
  return null
}

// Check for prefers-reduced-motion to disable CSS transitions
function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

const root = useTemplateRef<HTMLElement>('root')
const scrollEl = computed(() =>
  props.scrollEl !== undefined ? unwrapEl(props.scrollEl) : root.value,
)

const messages = useUiMessages()

const { state, pullDistance, progress, refresh } = usePullToRefresh({
  scrollEl,
  onRefresh: () => props.onRefresh(),
  maxPull: () => props.maxPull,
  threshold: () => props.threshold,
})

const live = computed(() => state.value === 'pulling' || state.value === 'ready')

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.pullToRefresh,
  () => props.ui,
)

const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-pull-to-refresh-root'))
const zonePart = computed(() => resolveUiPart(cx, themedUi()?.zone, 'ui-pull-to-refresh-zone'))
const indicatorPart = computed(() =>
  resolveUiPart(cx, themedUi()?.indicator, 'ui-pull-to-refresh-indicator'),
)
const bubblePart = computed(() =>
  resolveUiPart(cx, themedUi()?.bubble, 'ui-pull-to-refresh-bubble'),
)
const labelPart = computed(() => resolveUiPart(cx, themedUi()?.label, 'ui-pull-to-refresh-label'))

const zoneStyle = computed(() => ({
  blockSize: `${pullDistance.value}px`,
  transition: live.value || reducedMotion() ? 'none' : undefined,
}))

const bubbleStyle = computed(() => {
  if (state.value === 'loading' || state.value === 'done') {
    return { transform: 'scale(1)', opacity: 1, transition: reducedMotion() ? 'none' : undefined }
  }
  const p = progress.value
  return {
    transform: `scale(${0.65 + 0.35 * p})`,
    opacity: 0.3 + 0.7 * p,
    transition: live.value || reducedMotion() ? 'none' : undefined,
  }
})

const arrowStyle = computed(() => ({
  transform: state.value === 'ready' ? 'rotate(180deg)' : 'rotate(0deg)',
}))

const labelText = computed(() => {
  switch (state.value) {
    case 'ready':
      return messages.value.pullToRefresh.release
    case 'loading':
      return messages.value.pullToRefresh.refreshing
    case 'done':
      return messages.value.pullToRefresh.updated
    default:
      return messages.value.pullToRefresh.pull
  }
})

defineExpose({ el: root, state, progress, refresh })
</script>
