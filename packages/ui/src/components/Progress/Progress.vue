<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-state="state"
    :data-motion="props.motion ? undefined : 'off'"
    v-bind="rootAttrs"
  >
    <div
      :class="trackPart.class"
      :style="[ring?.style, trackPart.style]"
      role="progressbar"
      :aria-valuemin="0"
      :aria-valuemax="max"
      :aria-valuenow="indeterminate ? undefined : total"
      :aria-valuetext="valueText"
      :aria-label="label ?? (attrs['aria-label'] as string | undefined)"
      :aria-labelledby="attrs['aria-labelledby'] as string | undefined"
      :aria-describedby="attrs['aria-describedby'] as string | undefined"
    >
      <template v-if="ring">
        <svg class="ui-progress-ring" :viewBox="ring.viewBox" aria-hidden="true">
          <path class="ui-progress-ring-track" :d="ring.d" :stroke-width="ring.stroke" />
          <path
            v-for="(segment, index) in segments"
            :key="index"
            ref="fills"
            :class="[fillPart.class, segment.variantClass]"
            :style="[segment.style, fillPart.style]"
            :d="ring.d"
            :stroke-width="ring.stroke"
            pathLength="100"
            :data-empty="!indeterminate && segment.percent === 0 ? '' : undefined"
          />
        </svg>
        <span v-if="$slots.default" class="ui-progress-center">
          <slot :percent="totalPercent" :value="total" />
        </span>
      </template>
      <template v-else>
        <div
          v-for="(segment, index) in segments"
          :key="index"
          ref="fills"
          :class="[fillPart.class, segment.variantClass]"
          :style="[segment.style, fillPart.style]"
        />
      </template>
    </div>
    <ul v-if="showLegend" :class="legendPart.class" :style="legendPart.style">
      <li
        v-for="(segment, index) in segments"
        :key="index"
        :class="legendItemPart.class"
        :style="legendItemPart.style"
      >
        <slot name="legend" :segment="segment.source" :index="index" :percent="segment.percent">
          <span class="ui-progress-swatch" :class="segment.variantClass" :style="segment.style" />
          <span class="ui-progress-legend-label">{{ segment.source.label }}</span>
          <span class="ui-progress-legend-value">{{ formatPercent(segment.percent) }}</span>
        </slot>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
export type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info'

export interface ProgressSegment {
  /** Amount this segment takes of `0`–`max`. Segments stack in order and clamp to what's left. */
  value: number
  /** Legend text. The legend shows once any segment has one. */
  label?: string
  /** Fill color variant. Segments without one (or a `color`) shade from the bar's own color, in order. */
  variant?: ProgressVariant
  /** Any CSS color, for a palette of your own. */
  color?: string
}
</script>

<script setup lang="ts">
import './Progress.css'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import { computed, onMounted, onScopeDispose, shallowRef, useAttrs, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { ProgressMotion } from '../../motion/types'
import { omitAttrs } from '../../composables/forwardedListeners'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
// Naming attributes belong on the progressbar, not the wrapper.
const rootAttrs = computed(() =>
  omitAttrs(attrs, ['aria-label', 'aria-labelledby', 'aria-describedby']),
)
const rawProps = withDefaults(
  defineProps<{
    /**
     * One value, or segments that stack into one bar (a storage breakdown, a budget).
     * `null`/`undefined` renders the indeterminate (looping) state.
     */
    value?: number | ProgressSegment[] | null
    /** Value that counts as complete; Progress clamps `value` to `0`–`max`. @default 100 */
    max?: number
    /** Accessible label for the progress bar. */
    label?: string
    /** Human-readable reading for assistive tech (`aria-valuetext`), e.g. "42 GB of 100 GB". */
    valueText?: string
    /** Fill color variant for one value, and the base color segments shade from. @default 'primary' */
    variant?: ProgressVariant
    /** `'circle'` draws a ring; the default slot sits in its middle. Segments work in both. @default 'line' */
    type?: 'line' | 'circle'
    /**
     * How much of the circle a ring covers, in degrees, with the gap centred at the bottom: `180` is a
     * half-ring gauge, `270` a speedometer. The value always fills that whole arc. @default 360
     */
    sweep?: number
    /** Track thickness, or the ring's size and thickness. @default 'md' */
    size?: 'sm' | 'md'
    /** Renders a legend under stacked segments that have labels. @default true */
    legend?: boolean
    /**
     * How it moves: its appearance (`{ initial: { track: { opacity: 0 } } }`) and its states
     * (`{ states: { complete: { root: { scale: [1, 1.02, 1] } } } }`). `{ when: 'visible' }` fills it once it scrolls into view. `false` skips the fill
     * transition; drive `fillEl`/`fillEls` yourself. @default true
     */
    motion?: ProgressMotion
    /** Class and style overrides for each part. */
    ui?: Partial<{
      root: UiPartValue
      track: UiPartValue
      fill: UiPartValue
      legend: UiPartValue
      legendItem: UiPartValue
    }>
  }>(),
  {
    max: 100,
    variant: 'primary',
    type: 'line',
    sweep: 360,
    size: 'md',
    legend: true,
    motion: undefined,
  },
)
const props = withProviderDefaults(rawProps, { motion: true })

defineSlots<{
  /** Content in the middle of a ring, or inside the arch of a gauge, such as the percentage. */
  default(props: { percent: number; value: number }): unknown
  /** Replaces one legend row. */
  legend(props: { segment: ProgressSegment; index: number; percent: number }): unknown
}>()

interface ResolvedSegment {
  source: ProgressSegment
  /** The clamped amount, kept as given so totals don't pick up float noise from a percent round trip. */
  amount: number
  percent: number
  variantClass: string | undefined
  style: Record<string, string>
}

const indeterminate = computed(() => props.value == null)
const range = computed(() => Math.max(0, props.max))

// `when: 'visible'`: the fill waits at empty until the bar scrolls into view, then fills.
const waiting = shallowRef(
  typeof rawProps.motion === 'object' && (rawProps.motion as { when?: string }).when === 'visible',
)
onMounted(() => {
  const el = root.value
  if (!waiting.value || !el || typeof IntersectionObserver === 'undefined')
    return void (waiting.value = false)
  const viewer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return
      waiting.value = false
      viewer.disconnect()
    },
    // Its own document's viewport: inside an iframe too, not the top page's.
    { root: document, rootMargin: '0px 0px -10% 0px' },
  )
  viewer.observe(el)
  onScopeDispose(() => viewer.disconnect())
})

// A custom property, not an inline transform, so motion-v/GSAP consumers can drive a fill directly.
const segments = computed<ResolvedSegment[]>(() => {
  const sources: ProgressSegment[] = Array.isArray(props.value)
    ? props.value
    : [{ value: props.value ?? 0 }]
  let used = 0
  let shade = 0
  return sources.map((source) => {
    const value = Math.min(Math.max(0, source.value), range.value - used)
    const style: Record<string, string> = {
      '--ui-progress-scale': String(range.value > 0 && !waiting.value ? value / range.value : 0),
      // Where a ring segment begins: the share every segment before it takes.
      '--ui-progress-start': String(range.value > 0 ? used / range.value : 0),
    }
    used += value
    // A variable, not `background`, so a ring's stroke takes the color too.
    if (source.color) style['--ui-progress-paint'] = source.color
    else if (!source.variant && shade > 0) style['--ui-progress-shade'] = String(shade)
    if (!source.variant && !source.color) shade++
    return {
      source,
      amount: value,
      percent: range.value > 0 ? (value / range.value) * 100 : 0,
      variantClass: source.variant ? `ui-progress-segment--${source.variant}` : undefined,
      style,
    }
  })
})

const total = computed(() => segments.value.reduce((sum, segment) => sum + segment.amount, 0))
const totalPercent = computed(() => (range.value > 0 ? (total.value / range.value) * 100 : 0))

// One path per ring, normalised to a length of 100 (pathLength) so a value is plain dash math on
// any sweep. The circle sits in a 100-unit box; a partial arc's viewBox is cropped to the arc (and
// its round ends), and the track keeps the full circle's scale by widening with the crop.
const round3 = (n: number) => Math.round(n * 1000) / 1000
const ring = computed(() => {
  if (props.type !== 'circle') return null
  const sweep = Math.min(360, Math.max(1, props.sweep))
  const stroke = props.size === 'sm' ? 14 : 10
  const r = 50 - stroke / 2
  // 0deg is the top, clockwise; an arc runs symmetrically around the top.
  const at = (deg: number) => {
    const rad = (deg * Math.PI) / 180
    return { x: round3(50 + r * Math.sin(rad)), y: round3(50 - r * Math.cos(rad)) }
  }
  let d: string
  let box = { x: 0, y: 0, w: 100, h: 100 }
  if (sweep >= 360) {
    d = `M 50 ${50 - r} A ${r} ${r} 0 1 1 50 ${50 + r} A ${r} ${r} 0 1 1 50 ${50 - r}`
  } else {
    const from = at(-sweep / 2)
    const to = at(sweep / 2)
    d = `M ${from.x} ${from.y} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${to.x} ${to.y}`
    const points = [from, to]
    for (const deg of [-180, -90, 0, 90, 180]) {
      if (deg > -sweep / 2 && deg < sweep / 2) points.push(at(deg))
    }
    const pad = stroke / 2
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const x = Math.min(...xs) - pad
    const y = Math.min(...ys) - pad
    box = { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y }
  }
  return {
    stroke,
    d,
    arc: sweep < 360,
    viewBox: [box.x, box.y, box.w, box.h].map(round3).join(' '),
    style: {
      '--ui-progress-ring-width': String(round3(box.w / 100)),
      // The circle's centre inside the cropped box: the label sits on it, or just above it once
      // the arc is a half or less, so it stays inside the arch.
      '--ui-progress-center-x': `${round3(((50 - box.x) / box.w) * 100)}%`,
      '--ui-progress-center-y': `${round3(((50 - box.y) / box.h) * 100)}%`,
      '--ui-progress-center-shift': sweep > 180 ? '-50%' : '-100%',
    },
  }
})
const state = computed(() => {
  if (indeterminate.value) return 'indeterminate'
  return total.value >= props.max ? 'complete' : 'loading'
})
const showLegend = computed(
  () => props.legend && Array.isArray(props.value) && props.value.some((segment) => segment.label),
)

const percentFormat = new Intl.NumberFormat(undefined, {
  style: 'percent',
  maximumFractionDigits: 0,
})
function formatPercent(percent: number): string {
  return percentFormat.format(percent / 100)
}

const root = useTemplateRef<HTMLElement>('root')
const fills = useTemplateRef<(HTMLElement | SVGPathElement)[]>('fills')
const parts = useStateMotion({
  key: 'progress',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: {
    root: '.ui-progress',
    track: '.ui-progress-track',
    fill: '.ui-progress-fill',
    legend: '.ui-progress-legend',
  },
  states: () => ({
    complete: state.value === 'complete',
    indeterminate: indeterminate.value,
  }),
})
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.progress,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-progress',
    `ui-progress--${props.size}`,
    `ui-progress--${props.variant}`,
    `ui-progress--${props.type}`,
    props.type === 'circle' && 'ui-progress--ring',
    ring.value?.arc && 'ui-progress--arc',
    Array.isArray(props.value) && 'ui-progress--stacked',
  ),
)
const trackPart = computed(() => resolveUiPart(cx, themedUi()?.track, 'ui-progress-track'))
const fillPart = computed(() => resolveUiPart(cx, themedUi()?.fill, 'ui-progress-fill'))
const legendPart = computed(() => resolveUiPart(cx, themedUi()?.legend, 'ui-progress-legend'))
const legendItemPart = computed(() =>
  resolveUiPart(cx, themedUi()?.legendItem, 'ui-progress-legend-item'),
)

defineExpose({
  /** Root element. */
  el: root,
  /**
   * The first fill: a bar's `<div>` or a ring's `<path>`. Its share comes from the
   * `--ui-progress-scale` custom property, and a ring segment's start from `--ui-progress-start`.
   */
  fillEl: computed(() => fills.value?.[0] ?? null),
  /** Every fill, one per stacked segment, in order. */
  fillEls: computed(() => fills.value ?? []),
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
