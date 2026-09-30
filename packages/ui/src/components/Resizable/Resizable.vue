<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="[sizeStyle, rootPart.style]"
    :data-resizing="isDragging || undefined"
    :aria-disabled="disabled || undefined"
    v-bind="attrs"
  >
    <slot />
    <div
      ref="handleEl"
      :class="handlePart.class"
      :style="handlePart.style"
      :data-direction="direction"
      :data-edge="edge"
      :data-active="isDragging || undefined"
      role="separator"
      :aria-orientation="direction === 'horizontal' ? 'vertical' : 'horizontal'"
      :aria-valuenow="Math.round(modelValue)"
      :aria-valuemin="min"
      :aria-valuemax="Number.isFinite(max) ? max : undefined"
      :aria-label="ariaLabel"
      :tabindex="disabled ? -1 : 0"
      @pointerdown="onHandlePointerdown"
      @keydown="onHandleKeydown"
    >
      <slot name="handle" />
    </div>
  </div>
</template>

<!-- General-purpose resize primitive: wraps content + draggable handle, axis/edge-agnostic; no live-drag transitions -->
<script setup lang="ts">
import './Resizable.css'
import '../shared/tokens.css'
import { computed, useAttrs, useTemplateRef } from 'vue'
import { useResizable } from '../../composables/useResizable'
import type { ResizeDirection, ResizeEdge } from '../../composables/useResizable'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

/** Panel size in pixels along `direction`. Overshoots `min` or `max` elastically mid-drag, then settles within them. */
const modelValue = defineModel<number>('size', { required: true })

const props = withDefaults(
  defineProps<{
    /** Smallest size in pixels. @default 0 */
    min?: number
    /** Largest size in pixels. @default Infinity */
    max?: number
    /**
     * Axis the panel resizes along: `'horizontal'` sets its width, `'vertical'` its height.
     * @default 'horizontal'
     */
    direction?: ResizeDirection
    /**
     * Which edge the handle sits on. `'start'` flips the drag so moving toward the panel grows it.
     * @default 'end'
     */
    edge?: ResizeEdge
    /** Disables dragging and keyboard resizing, and removes the handle from the tab order. @default false */
    disabled?: boolean
    /** Accessible label for the handle. @default 'Resize' */
    ariaLabel?: string
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue; handle: UiPartValue }>
  }>(),
  {
    min: 0,
    max: Infinity,
    direction: 'horizontal',
    edge: 'end',
    disabled: false,
    ariaLabel: 'Resize',
  },
)

defineSlots<{
  /** Panel content. */
  default(): unknown
  /** Custom content inside the drag handle. */
  handle(): unknown
}>()

const root = useTemplateRef<HTMLElement>('root')
const handleEl = useTemplateRef<HTMLElement>('handleEl')

const { isDragging, onHandlePointerdown, onHandleKeydown } = useResizable(modelValue, {
  min: () => props.min,
  max: () => props.max,
  direction: () => props.direction,
  edge: () => props.edge,
  disabled: () => props.disabled,
})

const sizeStyle = computed(() => ({
  [props.direction === 'horizontal' ? 'inlineSize' : 'blockSize']: `${modelValue.value}px`,
}))

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.resizable,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-resizable',
    `ui-resizable--${props.direction}`,
    props.disabled && 'ui-resizable--disabled',
  ),
)
const handlePart = computed(() => resolveUiPart(cx, themedUi()?.handle, 'ui-resizable-handle'))

defineExpose({
  /** Root element. */
  el: root,
  /** Drag handle element. */
  handleEl,
  /** Whether you're dragging the handle with a pointer. */
  isDragging,
})
</script>
