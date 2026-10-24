<template>
  <TransitionGroup
    :ref="registerRootEl"
    :data-ui-group="groupKey"
    v-scroll-mask="orientation === 'horizontal' ? 'x' : false"
    tag="ol"
    :class="rootPart.class"
    :style="rootPart.style"
    v-bind="itemsTransition"
  >
    <li
      v-for="row in resolvedItems"
      :key="row.key"
      ref="stepEls"
      :class="itemPart.class"
      :style="itemPart.style"
      :data-completed="row.completed || undefined"
      :data-active="row.active || undefined"
      :aria-current="row.active ? 'step' : undefined"
    >
      <div v-if="$slots.opposite" :class="oppositePart.class" :style="oppositePart.style">
        <slot
          name="opposite"
          :item="row.item"
          :index="row.index"
          :completed="row.completed"
          :active="row.active"
        />
      </div>
      <span :class="markerColPart.class" :style="markerColPart.style">
        <span
          ref="markerEls"
          :class="markerPart.class"
          :style="markerPart.style"
          aria-hidden="true"
        >
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
          :style="connectorPart.style"
          aria-hidden="true"
          :data-filled="row.completed || undefined"
        />
      </span>
      <div :class="contentPart.class" :style="contentPart.style">
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
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import { computed, ref, useId, useSlots, useTemplateRef } from 'vue'
import { transitionGroupRef, useSlotPresence } from '../../composables/dom'
import { useClassMerge, resolveUiPart } from '../../classes'
import { vScrollMask } from '../../directives/vScrollMask'
import { useFocusableScroller } from '../../composables/useFocusableScroller'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useComponentList } from '../../motion/useMotion'
import { useMotionStyle } from '../../motion/context'
import type { TimelineMotion, TimelinePart } from '../../motion/types'

const rawProps = withDefaults(
  defineProps<{
    /** Entries to show; any shape, rendered through the `#item` slot. */
    items: ReadonlyArray<T>
    /** Lays the entries out in a row or a column. @default 'vertical' */
    orientation?: 'horizontal' | 'vertical'
    /**
     * `false` turns off the connector fill and items coming and going. An object animates items your
     * way: values for `item` or a step's own parts (`marker`, `connector`, `previousConnector`,
     * `content`, `opposite`), `stagger`, or `enter` / `leave` hooks that get them all.
     * @default true
     */
    motion?: TimelineMotion
    /** Adds a looping pulse ring to the active marker. @default false */
    pulse?: boolean
    /**
     * Stable key for each item. Pass it when items can be reordered or removed.
     * @default (item, index) => index
     */
    itemKey?: (item: T, index: number) => string | number
    /** Whether an item is done, which fills its dot and connector. Takes priority over `current`. */
    completed?: (item: T, index: number) => boolean
    /** Whether an item is the current one, which rings its marker (and pulses it with `pulse`).
     * Independent of `completed`; takes priority over `current`. */
    active?: (item: T, index: number) => boolean
    /** Index of the current item: earlier items read as completed, this one as active. Not a v-model;
     * Timeline never changes it. `completed`/`active` override it when given. */
    current?: number
    /** Class and style overrides for each part. */
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
    motion: undefined,
    pulse: false,
    itemKey: (_item: T, index: number) => index,
  },
)
const props = withProviderDefaults(rawProps, { motion: true })

// Direct children only, so a Timeline nested in a step's content isn't picked up.
function partsOf(el: Element): Record<Exclude<TimelinePart, 'item'>, HTMLElement | null> {
  const child = (parent: Element | null | undefined, cls: string) =>
    parent?.querySelector<HTMLElement>(`:scope > .${cls}`) ?? null
  const col = child(el, 'ui-timeline-marker-col')
  return {
    marker: child(col, 'ui-timeline-marker'),
    connector: child(col, 'ui-timeline-connector'),
    previousConnector: child(
      child(el.previousElementSibling, 'ui-timeline-marker-col'),
      'ui-timeline-connector',
    ),
    content: child(el, 'ui-timeline-content'),
    opposite: child(el, 'ui-timeline-opposite'),
  }
}
// Yours (an object, or a shared style): items come and go on the motion system, their parts with
// them. Otherwise the built-in CSS look.
const style = useMotionStyle()
const listMotion =
  (typeof rawProps.motion === 'object' || style?.value?.timeline || style?.value?.list) &&
  props.motion !== false
    ? useComponentList(() => rawProps.motion, {
        key: 'timeline',
        part: 'item',
        name: 'Timeline',
        look: () =>
          props.orientation === 'horizontal' ? { opacity: 0, x: 8 } : { opacity: 0, y: 8 },
        parts: partsOf,
      })
    : undefined
const itemsTransition = computed(() =>
  listMotion
    ? listMotion.transition
    : { name: props.motion ? 'ui-timeline-item' : undefined, css: !!props.motion },
)

const $slots = useSlots()
const hasSlot = useSlotPresence($slots)

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
  /** Content on the other side of the line from `#item`, such as a date. Without it, Timeline reserves no column. */
  opposite(props: { item: T; index: number; completed: boolean; active: boolean }): unknown
  /** Custom marker content, replacing the default dot. */
  marker(props: { item: T; index: number; completed: boolean; active: boolean }): unknown
  /** Content for each item; defaults to the item itself as text. */
  item(props: {
    item: T
    index: number
    completed: boolean
    active: boolean
    isLast: boolean
  }): unknown
}>()

const root = ref<HTMLElement | null>(null)
useFocusableScroller(root)
const groupKey = useId()
const registerRootEl = transitionGroupRef(root, groupKey)

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
    hasSlot('opposite') && 'ui-timeline--has-opposite',
    props.pulse && 'ui-timeline--pulse',
    !props.motion && 'ui-timeline--no-motion',
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

defineExpose({
  /** Root element. */
  el: root,
  /** Item (`<li>`) elements, in order. */
  stepEls,
  /** Marker elements, in order. */
  markerEls,
  /** Connector elements, one fewer than items (the last item has none). */
  connectorEls,
})
</script>
