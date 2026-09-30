<template>
  <ol
    ref="root"
    v-scroll-mask="orientation === 'horizontal' ? 'x' : false"
    :aria-orientation="orientation"
    :class="rootPart.class"
    :style="rootPart.style"
  >
    <template v-for="(item, index) in items" :key="index">
      <li
        :class="stepPart.class"
        :data-state="stateOf(index)"
        :data-disabled="isDisabled(item) ? '' : undefined"
      >
        <component
          :is="isReachable(index, item) ? 'button' : 'div'"
          :type="isReachable(index, item) ? 'button' : undefined"
          :class="triggerPart.class"
          :aria-disabled="isDisabled(item) ? 'true' : undefined"
          :aria-current="index === modelValue ? 'step' : undefined"
          @click="onStepClick(index, item)"
        >
          <span :class="circlePart.class">
            <slot
              name="indicator"
              :item="item"
              :index="index"
              :state="stateOf(index)"
              :active="index === modelValue"
              :completed="stateOf(index) === 'completed'"
              :disabled="isDisabled(item)"
            >
              <Transition :name="motionCss ? 'ui-stepper-check' : undefined">
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
          <span :class="contentPart.class">
            <slot
              name="item"
              :item="item"
              :index="index"
              :active="index === modelValue"
              :completed="stateOf(index) === 'completed'"
              :disabled="isDisabled(item)"
            >
              <span :class="labelPart.class">{{ item.label }}</span>
              <span v-if="item.description" :class="descriptionPart.class">{{
                item.description
              }}</span>
            </slot>
          </span>
        </component>
      </li>
      <li
        v-if="index < items.length - 1"
        aria-hidden="true"
        :class="connectorPart.class"
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
import '../shared/tokens.css'
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import { vScrollMask } from '../../directives/vScrollMask'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

/** Index of the active step. @default 0 */
const modelValue = defineModel<number>({ default: 0 })

const props = withDefaults(
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
    /** Gates the built-in check-mark/number swap transition inside the step circle. @default true */
    motionCss?: boolean
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
  { orientation: 'horizontal', linear: true, clickable: true, motionCss: true },
)

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
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.stepper,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(cx, themedUi()?.root, 'ui-stepper', `ui-stepper--${props.orientation}`),
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
})
</script>
