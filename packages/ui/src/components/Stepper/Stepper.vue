<template>
  <ol
    ref="root"
    v-scroll-mask="orientation === 'horizontal' ? 'x' : false"
    :class="rootPart.class"
    :style="rootPart.style"
  >
    <template v-for="(item, index) in items" :key="index">
      <li
        :class="stepPart.class"
        :style="stepPart.style"
        :data-state="stateOf(index)"
        :data-disabled="isDisabled(item) ? '' : undefined"
      >
        <component
          :is="nativeTag(clickable ? 'button' : 'div')"
          :type="clickable ? 'button' : undefined"
          :disabled="clickable && !isReachable(index, item) ? true : undefined"
          :class="triggerPart.class"
          :style="triggerPart.style"
          :aria-disabled="isDisabled(item) ? 'true' : undefined"
          :aria-current="index === modelValue ? 'step' : undefined"
          @click="onStepClick(index, item)"
        >
          <span
            :ref="(el) => setCircleEl(index, el)"
            :class="circlePart.class"
            :style="circlePart.style"
          >
            <slot
              name="indicator"
              :item="item"
              :index="index"
              :state="stateOf(index)"
              :active="index === modelValue"
              :completed="stateOf(index) === 'completed'"
              :disabled="isDisabled(item)"
            >
              <Transition :name="props.motion ? 'ui-stepper-check' : undefined">
                <svg
                  v-if="stateOf(index) === 'completed'"
                  key="check"
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8.5l3 3 7-7"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span v-else key="number">{{ index + 1 }}</span>
              </Transition>
            </slot>
          </span>
          <span :class="contentPart.class" :style="contentPart.style">
            <slot
              name="item"
              :item="item"
              :index="index"
              :active="index === modelValue"
              :completed="stateOf(index) === 'completed'"
              :disabled="isDisabled(item)"
            >
              <span
                :ref="(el) => setLabelEl(index, el)"
                :class="labelPart.class"
                :style="labelPart.style"
                >{{ item.label }}</span
              >
              <span
                v-if="item.description"
                :class="descriptionPart.class"
                :style="descriptionPart.style"
                >{{ item.description }}</span
              >
            </slot>
          </span>
          <span v-if="stateOf(index) === 'completed'" :style="visuallyHidden">{{
            messages.stepper.completed
          }}</span>
        </component>
      </li>
      <li
        v-if="index < items.length - 1"
        :ref="(el) => setConnectorEl(index, el)"
        aria-hidden="true"
        :class="connectorPart.class"
        :style="connectorPart.style"
        :data-state="index < modelValue ? 'filled' : 'unfilled'"
      />
    </template>
  </ol>
</template>

<script lang="ts">
export interface StepperItem {
  label: string
  description?: string
  disabled?: boolean
}
</script>

<script setup lang="ts" generic="T extends StepperItem = StepperItem">
import './Stepper.css'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import { nativeTag } from '../../composables/dom'
import { computed, ref, shallowReactive, useTemplateRef, watch } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import { vScrollMask } from '../../directives/vScrollMask'
import { useFocusableScroller } from '../../composables/useFocusableScroller'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useUiMessages } from '../../messages'
import { useStateMotion } from '../../motion/useStateMotion'
import type { StepperMotion } from '../../motion/types'

/** Index of the active step. @default 0 */
const modelValue = defineModel<number>({ default: 0 })

const rawProps = withDefaults(
  defineProps<{
    /** Steps to show, each with a `label` and optional `description` and `disabled`. */
    items: ReadonlyArray<T>
    /** Lays the steps out in a row or a column. @default 'horizontal' */
    orientation?: 'horizontal' | 'vertical'
    /**
     * Blocks clicks on steps you haven't reached yet, so you can't skip ahead. Every step up to the
     * furthest one reached stays clickable, even after stepping back.
     * @default true
     */
    linear?: boolean
    /** `false` renders a display-only progress indicator with no click handling. @default true */
    clickable?: boolean
    /**
     * How it moves: its parts' appearance, step by step (`{ initial: { step: { opacity: 0, y: 4 } }, stagger: 0.06 }`),
     * over `root`, `step`, `circle`, `connector` and `content`. The built-in transitions are the
     * check swap, circle colors and connector fill; `false` makes them instant.
     * @default true
     */
    motion?: StepperMotion
    /** Class and style overrides for each part. */
    ui?: Partial<{
      root: UiPartValue
      step: UiPartValue
      trigger: UiPartValue
      circle: UiPartValue
      content: UiPartValue
      label: UiPartValue
      description: UiPartValue
      connector: UiPartValue
    }>
  }>(),
  { orientation: 'horizontal', linear: true, clickable: true, motion: undefined },
)
const props = withProviderDefaults(rawProps, { motion: true })

const emit = defineEmits<{
  /** Fires when you click a step and it becomes active. */
  change: [index: number, item: T]
}>()

defineSlots<{
  /** Custom label content for each step, replacing the default label and description. */
  item(props: {
    item: T
    index: number
    active: boolean
    completed: boolean
    disabled: boolean
  }): unknown
  /** Replaces the content inside each step's circle (the number or check mark). The circle itself stays, so its size, border and focus ring still apply; restyle it via `ui.circle`. */
  indicator(props: {
    item: T
    index: number
    state: 'completed' | 'active' | 'upcoming'
    active: boolean
    completed: boolean
    disabled: boolean
  }): unknown
}>()

function stateOf(index: number): 'completed' | 'active' | 'upcoming' {
  if (index < modelValue.value) return 'completed'
  if (index === modelValue.value) return 'active'
  return 'upcoming'
}
function isDisabled(item: T): boolean {
  return !!item.disabled
}
// Linear mode lets you revisit any step you've already reached, so stepping
// back doesn't lock the steps you came from.
const furthestReached = ref(modelValue.value)
watch(modelValue, (index) => {
  if (index > furthestReached.value) furthestReached.value = index
})
function isReachable(index: number, item: T): boolean {
  if (!props.clickable || isDisabled(item)) return false
  return !props.linear || index <= Math.max(furthestReached.value, modelValue.value)
}
function onStepClick(index: number, item: T) {
  if (index === modelValue.value || !isReachable(index, item)) return
  modelValue.value = index
  emit('change', index, item)
}

const root = useTemplateRef<HTMLElement>('root')
useFocusableScroller(root)
const parts = useStateMotion({
  key: 'stepper',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: {
    root: '.ui-stepper',
    step: '.ui-stepper-step',
    circle: '.ui-stepper-circle',
    connector: '.ui-stepper-connector',
    content: '.ui-stepper-content',
  },
  states: () => ({}),
  // Step by step: each step, circle and line plays its own states.
  repeated: ['step', 'circle', 'connector', 'content'],
  each: (part, _, index) =>
    part === 'connector'
      ? { completed: index < modelValue.value, upcoming: index >= modelValue.value }
      : {
          current: index === modelValue.value,
          completed: index < modelValue.value,
          upcoming: index > modelValue.value,
          disabled: isDisabled(props.items[index]!),
        },
})
// By index: a v-for ref array would reorder.
const circleSlots = shallowReactive<(HTMLElement | null)[]>([])
const labelSlots = shallowReactive<(HTMLElement | null)[]>([])
const connectorSlots = shallowReactive<(HTMLElement | null)[]>([])
function setCircleEl(index: number, el: unknown) {
  circleSlots[index] = el instanceof HTMLElement ? el : null
}
function setConnectorEl(index: number, el: unknown) {
  connectorSlots[index] = el instanceof HTMLElement ? el : null
}
function setLabelEl(index: number, el: unknown) {
  labelSlots[index] = el instanceof HTMLElement ? el : null
}
const present = (el: HTMLElement | null): el is HTMLElement => !!el
const circleEls = computed(() => circleSlots.slice(0, props.items.length).filter(present))
const connectorEls = computed(() =>
  connectorSlots.slice(0, Math.max(props.items.length - 1, 0)).filter(present),
)
const labelEls = computed(() => labelSlots.slice(0, props.items.length).filter(present))
const messages = useUiMessages()
// The check is drawn, not read: a completed step says so in words.
const visuallyHidden = {
  position: 'absolute',
  inlineSize: '1px',
  blockSize: '1px',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
} as const
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.stepper,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-stepper',
    `ui-stepper--${props.orientation}`,
    !props.motion && 'ui-stepper--no-anim',
  ),
)
const stepPart = computed(() => resolveUiPart(cx, themedUi()?.step, 'ui-stepper-step'))
const triggerPart = computed(() => resolveUiPart(cx, themedUi()?.trigger, 'ui-stepper-trigger'))
const circlePart = computed(() => resolveUiPart(cx, themedUi()?.circle, 'ui-stepper-circle'))
const contentPart = computed(() => resolveUiPart(cx, themedUi()?.content, 'ui-stepper-content'))
const labelPart = computed(() => resolveUiPart(cx, themedUi()?.label, 'ui-stepper-label'))
const descriptionPart = computed(() =>
  resolveUiPart(cx, themedUi()?.description, 'ui-stepper-description'),
)
const connectorPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.connector,
    'ui-stepper-connector',
    `ui-stepper-connector--${props.orientation}`,
  ),
)

defineExpose({
  /** Root element. */
  el: root,
  /** Step circle elements, in order. */
  circleEls,
  /** Connector elements, one fewer than steps. Set `--ui-stepper-fill` (0 to 1) to drive a fill. */
  connectorEls,
  /** Step label elements, in order. Empty when the `item` slot replaces them. */
  labelEls,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
