<template>
  <div ref="root" :class="rootPart.class" :style="[labelVars, rootPart.style]" v-bind="dataAttrs">
    <div :class="controlPart.class" :style="[controlPart.style, controlVars]">
      <label
        v-if="label || $slots.label"
        :for="controlId"
        :id="labelId"
        :class="labelPart.class"
        :style="labelPart.style"
      >
        <slot name="label"
          ><span class="ui-field-label-text">{{ label }}</span></slot
        >
        <span v-if="required" class="ui-field-required" aria-hidden="true"></span>
      </label>
      <div v-if="$slots.prepend || $slots.append" :class="groupPart.class" :style="groupPart.style">
        <span
          v-if="$slots.prepend"
          ref="prependEl"
          :class="prependPart.class"
          :style="prependPart.style"
          :data-mixed="prependMixed || undefined"
          @mousedown="onCellMousedown"
          ><FieldCellScope><slot name="prepend" /></FieldCellScope
        ></span>
        <slot />
        <span
          v-if="$slots.append"
          ref="appendEl"
          :class="appendPart.class"
          :data-mixed="appendMixed || undefined"
          :style="appendPart.style"
          @mousedown="onCellMousedown"
          ><FieldCellScope><slot name="append" /></FieldCellScope
        ></span>
      </div>
      <slot v-else />
    </div>
    <p
      v-if="description || $slots.description"
      :id="descriptionId"
      :class="descriptionPart.class"
      :style="descriptionPart.style"
    >
      <slot name="description">{{ description }}</slot>
    </p>
    <Transition name="ui-field-error">
      <p v-if="error" :id="errorId" role="alert" :class="errorPart.class" :style="errorPart.style">
        <slot name="error" :error="error">{{ error }}</slot>
      </p>
    </Transition>
  </div>
</template>

<!-- Owns presentation + ARIA wiring; label inside control for overlap on float/inset placements; #prepend/#append wrap the control in a joined row -->
<script setup lang="ts">
import './Field.css'
import '../shared/tokens.css'
import {
  computed,
  onBeforeUnmount,
  onMounted,
  provide,
  shallowRef,
  useId,
  useSlots,
  useTemplateRef,
  watch,
} from 'vue'
import { useSlotPresence } from '../../composables/dom'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { ShallowRef } from 'vue'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { fieldKey } from '../../composables/fieldContext'
import FieldCellScope from '../internal/FieldCellScope.vue'
import type { FieldContext } from '../../composables/fieldContext'
import { useStateMotion } from '../../motion/useStateMotion'
import type { FieldMotion } from '../../motion/types'

const props = withDefaults(
  defineProps<{
    /** Label text, linked to the wrapped control. */
    label?: string
    /** Help text below the control, linked via `aria-describedby`. */
    description?: string
    /** Error message; renders with `role="alert"`. */
    error?: string
    /** Shows a required marker and sets `aria-required` on the wrapped control. */
    required?: boolean
    /** Disables the wrapped control. */
    disabled?: boolean
    /**
     * `'top'` stacks above the control; `'float'` overlays its edge, moving up on focus or fill; `'inset'` sits inside it; `'start'`/`'end'` sit before/after it on the same line. With `'start'`/`'end'`, add `attached` to join the label to the control as one box, and `labelWidth` to line up a column of fields.
     * @default 'top'
     */
    labelPlacement?: 'top' | 'float' | 'inset' | 'start' | 'end'
    /** Draws a `start`/`end` label as a muted cell that shares the control's border. It stays the real `<label>`. Controls without a bordered frame (Switch, Slider…) keep a plain side label. Has no effect with `top`, `float` or `inset`. @default false */
    attached?: boolean
    /** Width of a `start`/`end` label: a number is pixels, a string any CSS length (`'8rem'`). Give fields the same width to line up their controls, or set `--ui-field-label-width` once on a parent. An `attached` label truncates with an ellipsis when its text is wider. @default 'max-content' */
    labelWidth?: number | string
    /** Aligns a `start`/`end` label's text. Use `'end'` for right-aligned form labels that sit next to the control. @default 'start' */
    labelAlign?: 'start' | 'end'
    /**
     * How it moves: its parts' appearance (`{ initial: { label: { opacity: 0, y: 4 } } }`) and its
     * states (`{ states: { invalid: { control: { x: [0, -6, 6, 0] } } } }`). `false` turns its own
     * animation off.
     */
    motion?: FieldMotion
    /** Class and style overrides for each part. Joined cells (an `attached` label, `#prepend`, `#append`) take their colors from `--ui-field-cell-bg` and `--ui-field-cell-color`. */
    ui?: Partial<{
      root: UiPartValue
      label: UiPartValue
      control: UiPartValue
      group: UiPartValue
      prepend: UiPartValue
      append: UiPartValue
      description: UiPartValue
      error: UiPartValue
    }>
  }>(),
  // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
  { labelPlacement: 'top', attached: false, labelAlign: 'start', motion: undefined },
)

defineSlots<{
  /** The form control that the field labels and describes. */
  default(): unknown
  /** Replaces the label text, keeping the `<label>` element and its `for` wiring. */
  label(): unknown
  /** Cell joined to the control's leading edge. Text and icons share one segment, and each control (a Select, a Button) gets its own, so `$` plus a currency Select reads `[ $ | USD ]`. Put controls directly in the slot, not inside a wrapper element. The Field's label doesn't name them, so give each one an `aria-label`; the Field's `disabled` still applies. Next to a control without a frame (Switch, Slider…), the cell renders as plain text. */
  prepend(): unknown
  /** Cell joined to the control's trailing edge; same rules as `#prepend`. */
  append(): unknown
  /** Custom description content; replaces the `description` text. */
  description(): unknown
  /** Custom error content; renders only while `error` is set. */
  error(props: { error: string }): unknown
}>()

const controlId = useId()
const labelId = useId()
const descriptionId = useId()
const errorId = useId()

const slots = useSlots()
const hasSlot = useSlotPresence(slots)
const focused = shallowRef(false)
const filled = shallowRef(false)
const startInset = shallowRef(0)
// Framed controls register on mount; until then a joined Field assumes it has one.
const frames = shallowRef<(() => string | undefined)[]>([])
const mounted = shallowRef(false)
onMounted(() => (mounted.value = true))

const describedBy = computed(() => {
  const ids: string[] = []
  if (props.description || slots.description) ids.push(descriptionId)
  if (props.error) ids.push(errorId)
  return ids.length ? ids.join(' ') : undefined
})
const isInvalid = computed(() => !!props.error)

provide<FieldContext>(fieldKey, {
  controlId,
  labelId,
  describedBy: () => describedBy.value,
  invalid: () => isInvalid.value,
  required: () => !!props.required,
  disabled: () => !!props.disabled,
  reportFocus: (value) => {
    focused.value = value
  },
  reportFilled: (value) => {
    filled.value = value
  },
  reportStartInset: (value) => {
    startInset.value = value
  },
  registerFrame: (size) => {
    frames.value = [...frames.value, size]
    return () => (frames.value = frames.value.filter((entry) => entry !== size))
  },
})

// A float/inset label rests over the control, so it also clears a #prepend cell's width.
const prependEl = useTemplateRef<HTMLElement>('prependEl')
const prependWidth = shallowRef(0)
let prependObserver: ResizeObserver | undefined
watch(
  prependEl,
  (el) => {
    prependObserver?.disconnect()
    prependWidth.value = el ? el.offsetWidth : 0
    if (!el) return
    prependObserver = new ResizeObserver(() => {
      prependWidth.value = el.offsetWidth
    })
    prependObserver.observe(el)
  },
  { immediate: true },
)
onBeforeUnmount(() => prependObserver?.disconnect())

/** Children that take their own divided segment inside a Field #prepend/#append cell. */
const FIELD_CELL_CONTROL = '[data-ui-frame], button, .ui-button'

interface CellPart {
  node: Node
  control: boolean
}

function cellParts(cell: HTMLElement): CellPart[] {
  const parts: CellPart[] = []
  for (const node of cell.childNodes) {
    const isText = node.nodeType === Node.TEXT_NODE && node.textContent!.trim() !== ''
    const isElement = node.nodeType === Node.ELEMENT_NODE
    if (!isText && !isElement) continue
    parts.push({ node, control: isElement && (node as Element).matches(FIELD_CELL_CONTROL) })
  }
  return parts
}

function setNeighbour(el: Element, side: 'before' | 'after', part: CellPart | undefined): void {
  const attr = `data-cell-${side}`
  if (part) el.setAttribute(attr, part.control ? 'control' : 'text')
  else el.removeAttribute(attr)
}

/**
 * Tells each control in a cell what sits beside it, since CSS can't see bare text nodes:
 * `data-cell-before`/`data-cell-after` drive the dividers between segments. Returns whether the
 * cell mixes a control with anything else, which keeps the cell's own padding.
 */
function syncCell(cell: HTMLElement): boolean {
  const parts = cellParts(cell)
  parts.forEach((part, i) => {
    if (!part.control) return
    const el = part.node as Element
    setNeighbour(el, 'before', parts[i - 1])
    setNeighbour(el, 'after', parts[i + 1])
  })
  return parts.length > 1 && parts.some((part) => part.control)
}

function useFieldCell(cell: () => HTMLElement | null): ShallowRef<boolean> {
  const mixed = shallowRef(false)
  let observer: MutationObserver | undefined
  watch(
    cell,
    (el) => {
      observer?.disconnect()
      mixed.value = el ? syncCell(el) : false
      if (!el) return
      observer = new MutationObserver(() => {
        mixed.value = syncCell(el)
      })
      observer.observe(el, { childList: true, characterData: true, subtree: true })
    },
    { immediate: true },
  )
  onBeforeUnmount(() => observer?.disconnect())
  return mixed
}

const appendEl = useTemplateRef<HTMLElement>('appendEl')
const prependMixed = useFieldCell(() => prependEl.value)
const appendMixed = useFieldCell(() => appendEl.value)

// A text or icon cell behaves like the control's own frame: clicking it focuses the control.
function onCellMousedown(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('button, a, input, select, textarea, [tabindex]')) return
  const control = document.getElementById(controlId)
  if (!control) return
  event.preventDefault()
  control.focus()
}

const controlVars = computed(() => ({
  '--ui-field-start-inset': `${startInset.value}px`,
  '--ui-field-prepend-width': `${prependWidth.value}px`,
}))

const isSide = computed(() => props.labelPlacement === 'start' || props.labelPlacement === 'end')
const labelVars = computed(() =>
  isSide.value && props.labelWidth != null
    ? {
        '--ui-field-label-width':
          typeof props.labelWidth === 'number' ? `${props.labelWidth}px` : props.labelWidth,
      }
    : undefined,
)

const isAttached = computed(() => isSide.value && props.attached)
const joinStart = computed(
  () => hasSlot('prepend') || (isAttached.value && props.labelPlacement === 'start'),
)
const joinEnd = computed(
  () => hasSlot('append') || (isAttached.value && props.labelPlacement === 'end'),
)

const dataAttrs = computed(() => ({
  'data-placement': props.labelPlacement,
  'data-attached': isAttached.value || undefined,
  'data-joined': joinStart.value || joinEnd.value || undefined,
  'data-frameless':
    ((joinStart.value || joinEnd.value) && mounted.value && !frames.value.length) || undefined,
  'data-frame-size': frames.value[0]?.(),
  'data-join-start': joinStart.value || undefined,
  'data-join-end': joinEnd.value || undefined,
  'data-label-align': isSide.value ? props.labelAlign : undefined,
  'data-focused': focused.value || undefined,
  'data-filled': filled.value || undefined,
  'data-invalid': isInvalid.value || undefined,
  'data-disabled': props.disabled || undefined,
}))

const root = useTemplateRef<HTMLElement>('root')
const parts = useStateMotion({
  key: 'field',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: {
    root: '.ui-field',
    label: '.ui-field-label',
    control: '.ui-field-control',
    description: '.ui-field-description',
    error: '.ui-field-error',
  },
  states: () => ({
    invalid: isInvalid.value,
    disabled: !!props.disabled,
    focus: focused.value,
  }),
})
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.field,
  () => props.ui,
)
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-field'))
const controlPart = computed(() => resolveUiPart(cx, themedUi()?.control, 'ui-field-control'))
const labelPart = computed(() => resolveUiPart(cx, themedUi()?.label, 'ui-field-label'))
const groupPart = computed(() => resolveUiPart(cx, themedUi()?.group, 'ui-field-group'))
const prependPart = computed(() => resolveUiPart(cx, themedUi()?.prepend, 'ui-field-prepend'))
const appendPart = computed(() => resolveUiPart(cx, themedUi()?.append, 'ui-field-append'))
const descriptionPart = computed(() =>
  resolveUiPart(cx, themedUi()?.description, 'ui-field-description'),
)
const errorPart = computed(() => resolveUiPart(cx, themedUi()?.error, 'ui-field-error'))

defineExpose({
  /** Root element. */
  el: root,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
