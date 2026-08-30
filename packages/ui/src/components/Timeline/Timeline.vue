<template>
  <TransitionGroup
    :ref="registerRootEl"
    v-scroll-mask="orientation === 'horizontal' ? 'x' : false"
    tag="ol"
    :aria-orientation="orientation"
    :class="rootPart.class"
    :style="rootPart.style"
    :name="motionCss ? 'ui-timeline-item' : undefined"
    :css="motionCss"
    @enter="enterHook"
    @leave="leaveHook"
  >
    <li
      v-for="row in resolvedItems"
      :key="row.key"
      ref="stepEls"
      :class="itemPart.class"
      :data-completed="row.completed || undefined"
      :data-active="row.active || undefined"
    >
      <div v-if="$slots.opposite" :class="oppositePart.class">
        <slot
          name="opposite"
          :item="row.item"
          :index="row.index"
          :completed="row.completed"
          :active="row.active"
        />
      </div>
      <span :class="markerColPart.class">
        <span ref="markerEls" :class="markerPart.class" aria-hidden="true">
          <slot
            name="marker"
            :item="row.item"
            :index="row.index"
            :completed="row.completed"
            :active="row.active"
          >
            <span class="ui-timeline-dot" />
          </slot>
        </span>
        <span
          v-if="!row.isLast"
          ref="connectorEls"
          :class="connectorPart.class"
          aria-hidden="true"
          :data-filled="row.completed || undefined"
        />
      </span>
      <div :class="contentPart.class">
        <slot
          name="item"
          :item="row.item"
          :index="row.index"
          :completed="row.completed"
          :active="row.active"
          :is-last="row.isLast"
          >{{ row.item }}</slot
        >
      </div>
    </li>
  </TransitionGroup>
</template>

<!-- A structural primitive, not an activity-feed component: `items` can be anything (strings,
     numbers, a rich object with a start/end range instead of one date, whatever a consumer's
     actual data looks like) — this component only lays out the marker/connector chrome. It never
     assumes a shape to render; the #item slot is where content comes from (the bare `{{ item }}`
     fallback below only exists so an unslotted usage still shows *something* while wiring it up).

     No fixed status vocabulary either — earlier revisions hardcoded a closed
     'completed'|'active'|'upcoming' enum, which silently stopped working the moment a consumer's
     own domain used different words (success/failure/skipped, whatever). `completed`/`active` are
     two INDEPENDENT optional booleans instead: the minimum a connecting-line diagram genuinely
     needs to know (is this segment traversed, is this the current one), not a status system.
     Neither is a field the component expects ON an item — both are derivation functions, and a
     consumer with a richer vocabulary just reads their own `item` directly inside the #marker/#item
     slots and renders whatever icon/label/color scheme they want, no participation from Timeline
     required. `current` is a narrower convenience layered on top for the common single-linear-
     progression case (a plain index, not a v-model — Timeline never advances it itself);
     `completed`/`active` still win individually when given, for anything that isn't one straight
     line through the list.

     One <li> per item, not Stepper's alternating item/connector <li> pairs: the connector lives
     INSIDE its own item's marker column, sized with `flex: 1 1 auto` against that column's own
     `align-self: stretch` height (matching the item's real content height in that same row) — so
     it always reaches exactly to the next marker regardless of how tall this item's content is.
     A sibling-<li> connector (Stepper's approach) only stretches when the list has a definite
     size bigger than its content to distribute — true for Stepper's fixed-width horizontal
     row, never true for an auto-height vertical column, which is why that shape doesn't carry
     over here even though this looks superficially like a vertical Stepper.

     #opposite (optional, same name/idea as Vuetify's VTimelineItem) renders on the other side of
     the line from #item — a date/time gutter, a status pill, whatever reads better set apart from
     the main content — and turns each row into a 3-column grid instead of the plain 2-column
     marker+content layout when unused.

     TransitionGroup (not plain Transition, unlike Stepper's checkmark swap) because items is a
     real array a consumer can push/splice at runtime. -->
<script setup lang="ts" generic="T = unknown">
import './Timeline.css'
import '../shared/tokens.css'
import { computed, ref, useSlots, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import { vScrollMask } from '../../directives/vScrollMask'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

const props = withDefaults(
  defineProps<{
    items: ReadonlyArray<T>
    orientation?: 'horizontal' | 'vertical'
    /** Gates the connector fill transition and the item enter/leave/move animation. */
    motionCss?: boolean
    /** Opt-in continuous "live" pulse ring on the active marker. Off by default — a
     * looping animation is a real stylistic commitment this component shouldn't make for you. */
    pulse?: boolean
    /** Identifies an item across re-renders for TransitionGroup — defaults to its index, so pass
     * this whenever items can be reordered/spliced (not just appended) or it'll re-key wrong. */
    itemKey?: (item: T, index: number) => string | number
    /** Whether a step counts as "done" for the built-in dot fill and connector fill — the only
     * two things Timeline itself renders any state for. Omit for a plain, uncolored list; a
     * richer status vocabulary (success/failure/skipped, whatever) is still fully expressible —
     * just read your own `item` inside #marker/#item and render it yourself, no help from
     * Timeline needed. Takes priority over `current` when both are given. */
    completed?: (item: T, index: number) => boolean
    /** Whether a step is "the current one" — drives the marker's active ring (and, with `pulse`,
     * its live pulse). Independent of `completed`: a step can be both, neither, or either.
     * Takes priority over `current` when both are given. */
    active?: (item: T, index: number) => boolean
    /** Convenience for the common case where progress genuinely is one linear index: steps before
     * it read as completed, the one at it as active. Plain number, not a v-model — Timeline never
     * advances it itself (no built-in click-to-select), so there's nothing for it to write back.
     * Bind your own ref and advance it however fits your UI (a button, a click handler, an action
     * inside the active step's own content). Ignored per-flag once `completed`/`active` are given. */
    current?: number
    ui?: Partial<{
      root: UiPartValue
      item: UiPartValue
      opposite: UiPartValue
      marker: UiPartValue
      connector: UiPartValue
      content: UiPartValue
    }>
  }>(),
  {
    orientation: 'vertical',
    motionCss: true,
    pulse: false,
    itemKey: (_item: T, index: number) => index,
  },
)

const emit = defineEmits<{
  /** A step's enter transition started — forwarded straight from the underlying
   * TransitionGroup's own `(el, done)` hook. Only fires when `motionCss` is `false`, so an
   * external animation library (GSAP, motion-v, raw WAAPI) can own it instead — call `done()`
   * when your own animation finishes. Same shape as FileUpload's `item-enter`. */
  'item-enter': [el: Element, done: () => void]
  /** Same as `item-enter`, for a step's exit. */
  'item-leave': [el: Element, done: () => void]
}>()
const enterHook = computed(() =>
  props.motionCss ? undefined : (el: Element, done: () => void) => emit('item-enter', el, done),
)
const leaveHook = computed(() =>
  props.motionCss ? undefined : (el: Element, done: () => void) => emit('item-leave', el, done),
)

const $slots = useSlots()

function isCompleted(item: T, index: number): boolean {
  if (props.completed) return props.completed(item, index)
  if (props.current === undefined) return false
  return index < props.current
}
function isActive(item: T, index: number): boolean {
  if (props.active) return props.active(item, index)
  if (props.current === undefined) return false
  return index === props.current
}

// Resolved once per render, not once per slot/attribute — `completed`/`active` otherwise get
// called up to 5 times per item (both data-* attrs, all three slots, the connector) with the
// exact same arguments every time.
interface ResolvedRow {
  item: T
  index: number
  key: string | number
  completed: boolean
  active: boolean
  isLast: boolean
}
const resolvedItems = computed<ResolvedRow[]>(() =>
  props.items.map((item, index) => ({
    item,
    index,
    key: props.itemKey(item, index),
    completed: isCompleted(item, index),
    active: isActive(item, index),
    isLast: index === props.items.length - 1,
  })),
)

defineSlots<{
  /** The other side of the line from #item — a date, a status pill, whatever. Omit it entirely
   * and the row collapses back to the plain marker+content layout, no reserved empty column. */
  opposite(props: { item: T; index: number; completed: boolean; active: boolean }): unknown
  marker(props: { item: T; index: number; completed: boolean; active: boolean }): unknown
  item(props: {
    item: T
    index: number
    completed: boolean
    active: boolean
    isLast: boolean
  }): unknown
}>()

const root = ref<HTMLElement | null>(null)
function registerRootEl(el: Element | { $el?: unknown } | null) {
  if (el instanceof HTMLElement) {
    root.value = el
  } else if (el && '$el' in el && el.$el instanceof HTMLElement) {
    root.value = el.$el
  }
}

// Per-item elements, not just the root — an external animation library needs real nodes to
// stagger-reveal markers, scrub a "draw the line" effect across connectors, etc. `connectorEls`
// has one fewer entry than `stepEls`/`markerEls` (the last item has no trailing connector).
const stepEls = useTemplateRef<HTMLElement[]>('stepEls')
const markerEls = useTemplateRef<HTMLElement[]>('markerEls')
const connectorEls = useTemplateRef<HTMLElement[]>('connectorEls')

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.timeline,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-timeline',
    `ui-timeline--${props.orientation}`,
    !!$slots.opposite && 'ui-timeline--has-opposite',
    props.pulse && 'ui-timeline--pulse',
    !props.motionCss && 'ui-timeline--no-motion',
  ),
)
const itemPart = computed(() => resolveUiPart(cx, themedUi()?.item, 'ui-timeline-step'))
const oppositePart = computed(() => resolveUiPart(cx, themedUi()?.opposite, 'ui-timeline-opposite'))
const markerColPart = computed(() => resolveUiPart(cx, undefined, 'ui-timeline-marker-col'))
const markerPart = computed(() => resolveUiPart(cx, themedUi()?.marker, 'ui-timeline-marker'))
const connectorPart = computed(() =>
  resolveUiPart(cx, themedUi()?.connector, 'ui-timeline-connector'),
)
const contentPart = computed(() => resolveUiPart(cx, themedUi()?.content, 'ui-timeline-content'))

defineExpose({ el: root, stepEls, markerEls, connectorEls })
</script>
