<template>
  <Input
    ref="inputRef"
    v-bind="attrs"
    :model-value="displayValue"
    :placeholder="placeholder"
    :size="size"
    :disabled="isDisabled"
    :invalid="isInvalid"
    readonly
    role="combobox"
    aria-haspopup="dialog"
    :aria-expanded="open"
    :aria-controls="panelId"
    autocomplete="off"
    :ui="innerUi"
    @focus="onTriggerFocus"
    @keydown="onTriggerKeydown"
  >
    <template #end>
      <span class="ui-date-picker-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
          <rect
            x="2.5"
            y="3.5"
            width="11"
            height="10"
            rx="1.5"
            stroke="currentColor"
            stroke-width="1.3"
          />
          <path
            d="M2.5 6.5h11M5 2v2.5M11 2v2.5"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
          />
        </svg>
      </span>
    </template>
  </Input>

  <Teleport :to="teleportTo">
    <Transition name="ui-select" :css="!forceMount">
      <div
        v-if="forceMount || open"
        v-show="open"
        ref="positioner"
        :class="positionerPart.class"
        :style="[positionerStyle, positionerPart.style]"
        :data-ui-theme="themeScope"
        :data-state="isClosing ? 'closing' : 'open'"
        :data-side="resolvedSide"
        :data-align="resolvedAlign"
      >
        <div
          :id="panelId"
          ref="panel"
          role="dialog"
          aria-modal="false"
          aria-label="Choose date"
          :class="panelPart.class"
          :style="[{ transformOrigin }, panelPart.style]"
          v-bind="$attrs"
        >
          <Calendar
            ref="calendarRef"
            v-model="model"
            :selection-mode="selectionMode"
            :view="view"
            :min-date="minDate"
            :max-date="maxDate"
            :disabled-dates="disabledDates"
            :locale="locale"
            :first-day-of-week="firstDayOfWeek"
            :motion-css="motionCss"
            :ui="calendarUi"
            @change="onCalendarChange"
            @month-change="(value) => emit('month-change', value)"
          />
        </div>
      </div>
    </Transition>
  </Teleport>

  <template v-if="name">
    <template v-if="isRangeModel(model)">
      <input
        type="hidden"
        :name="`${name}[start]`"
        :value="model.start ? isoDate(model.start) : ''"
      />
      <input type="hidden" :name="`${name}[end]`" :value="model.end ? isoDate(model.end) : ''" />
    </template>
    <input v-else type="hidden" :name="name" :value="model ? isoDate(model) : ''" />
  </template>
</template>

<script lang="ts">
import type { Side } from '@floating-ui/dom'
import type { Align } from '../../composables/useFloatingPosition'

export type DatePickerSide = Side
export type DatePickerAlign = Align
</script>

<!-- Wraps Calendar in Select's popover chrome; input readonly, formatting deferred. -->
<script setup lang="ts">
import './DatePicker.css'
import '../shared/tokens.css'
import '../shared/select-panel.css'
import { computed, inject, nextTick, useAttrs, useId, useTemplateRef, watch } from 'vue'
import { usePopover } from '../../composables/usePopover'
import type { PopoverOpenChangeDetails } from '../../composables/usePopover'
import { useFieldControl } from '../../composables/useFieldControl'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { themeScopeKey, useThemedUi } from '../../theme'
import Input from '../Input/Input.vue'
import Calendar from '../Calendar/Calendar.vue'
import type {
  CalendarDisabledDates,
  CalendarRange,
  CalendarSelectionMode,
  CalendarView,
} from '../Calendar/Calendar.vue'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const model = defineModel<Date | CalendarRange | null>({ default: null })
const open = defineModel<boolean>('open', { default: false })

function isRangeModel(value: Date | CalendarRange | null): value is CalendarRange {
  return value != null && typeof value === 'object' && 'start' in value
}

const props = withDefaults(
  defineProps<{
    selectionMode?: CalendarSelectionMode
    view?: CalendarView
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
    size?: 'sm' | 'md' | 'lg'
    minDate?: Date
    maxDate?: Date
    disabledDates?: CalendarDisabledDates
    locale?: string
    firstDayOfWeek?: number
    /** Formats the trigger display. Default: `{ dateStyle: 'medium' }`. */
    formatOptions?: Intl.DateTimeFormatOptions
    /** Hidden `<input>` mirroring selection as `YYYY-MM-DD` for form post. */
    name?: string
    side?: DatePickerSide
    align?: DatePickerAlign
    sideOffset?: number
    alignOffset?: number
    closeOnEsc?: boolean
    closeOnOutside?: boolean
    beforeClose?: (done: () => void) => void
    forceMount?: boolean
    teleportTo?: string | HTMLElement
    /** `false` skips popover enter/leave AND Calendar's month-slide transition. */
    motionCss?: boolean
    ui?: Partial<{
      root: UiPartValue
      input: UiPartValue
      positioner: UiPartValue
      panel: UiPartValue
      header: UiPartValue
      navButton: UiPartValue
      label: UiPartValue
      weekdays: UiPartValue
      weekday: UiPartValue
      grid: UiPartValue
      cell: UiPartValue
    }>
  }>(),
  {
    selectionMode: 'single',
    view: 'date',
    placeholder: undefined,
    disabled: false,
    invalid: false,
    size: 'md',
    minDate: undefined,
    maxDate: undefined,
    disabledDates: undefined,
    locale: undefined,
    firstDayOfWeek: undefined,
    formatOptions: undefined,
    name: undefined,
    side: 'bottom',
    align: 'start',
    sideOffset: 8,
    alignOffset: 0,
    closeOnEsc: true,
    closeOnOutside: true,
    beforeClose: undefined,
    forceMount: false,
    teleportTo: 'body',
    motionCss: true,
    ui: undefined,
  },
)

const emit = defineEmits<{
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
  change: [value: Date | CalendarRange | null]
  'month-change': [value: Date]
}>()

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}
function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

// Default format narrows to match view (year/month/date); explicit formatOptions always win.
const defaultFormatOptions = computed<Intl.DateTimeFormatOptions>(() => {
  if (props.view === 'year') return { year: 'numeric' }
  if (props.view === 'month') return { month: 'long', year: 'numeric' }
  return { dateStyle: 'medium' }
})
const formatter = computed(
  () => new Intl.DateTimeFormat(props.locale, props.formatOptions ?? defaultFormatOptions.value),
)
const displayValue = computed(() => {
  const value = model.value
  if (!value) return ''
  if (isRangeModel(value)) {
    if (!value.start) return ''
    const startText = formatter.value.format(value.start)
    if (!value.end) return `${startText} – …`
    return `${startText} – ${formatter.value.format(value.end)}`
  }
  return formatter.value.format(value)
})

function onCalendarChange(value: Date | CalendarRange | null) {
  emit('change', value)
  // Range mode: don't auto-close until both endpoints are committed.
  if (isRangeModel(value) && !value.end) return
  close()
}

const inputRef = useTemplateRef('inputRef')
const el = computed(() => inputRef.value?.el ?? null)
const inputEl = computed(() => inputRef.value?.inputEl ?? null)
const positionerEl = useTemplateRef<HTMLElement>('positioner')
const panelEl = useTemplateRef<HTMLElement>('panel')
const calendarRef = useTemplateRef<InstanceType<typeof Calendar>>('calendarRef')

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.datePicker,
  () => props.ui,
)
const themeScope = inject(themeScopeKey, undefined)

const { positionerStyle, placement, transformOrigin, isClosing, close, cancelClose } = usePopover(
  open,
  {
    triggerEl: el,
    positionerEl,
    side: () => props.side,
    align: () => props.align,
    sideOffset: () => props.sideOffset,
    alignOffset: () => props.alignOffset,
    // Calendar grid width is content-driven, not trigger-width-dependent like Select/TreeSelect.
    matchReferenceWidth: false,
    closeOnEsc: () => props.closeOnEsc,
    closeOnOutside: () => props.closeOnOutside,
    beforeClose: () => props.beforeClose,
    onOpenChange: (value, details) => emit('open-change', value, details),
  },
)

const panelId = useId()

const fieldControl = useFieldControl()
const isInvalid = computed(() => props.invalid || fieldControl.invalid())
const isDisabled = computed(() => props.disabled || fieldControl.disabled())

let suppressNextFocusOpen = false
function onTriggerFocus() {
  if (suppressNextFocusOpen) {
    suppressNextFocusOpen = false
    return
  }
  if (!isDisabled.value) open.value = true
}
function onTriggerKeydown(event: KeyboardEvent) {
  if (isDisabled.value || open.value) return
  if (event.key === 'Escape') return
  if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
    event.preventDefault()
    open.value = true
  }
}

// Focus panel once positioner is visible; wait for floating-ui's computePosition() to resolve.
watch(
  () => open.value && positionerStyle.value.visibility === 'visible',
  (ready) => {
    if (!ready) return
    const value = model.value
    const anchor =
      value == null
        ? new Date()
        : isRangeModel(value)
          ? (value.end ?? value.start ?? new Date())
          : value
    nextTick(() => calendarRef.value?.focusDay(anchor))
  },
)
// Return focus to trigger only if it was inside the panel; suppressNextFocusOpen prevents auto-reopen.
watch(open, (value) => {
  if (value) return
  nextTick(() => {
    const active = document.activeElement
    if (active instanceof Node && positionerEl.value?.contains(active)) {
      suppressNextFocusOpen = true
      inputEl.value?.focus()
    }
  })
})

const innerUi = computed(() => ({
  root: themedUi()?.root,
  input: themedUi()?.input,
}))
const calendarUi = computed(() => ({
  header: themedUi()?.header,
  navButton: themedUi()?.navButton,
  label: themedUi()?.label,
  weekdays: themedUi()?.weekdays,
  weekday: themedUi()?.weekday,
  grid: themedUi()?.grid,
  cell: themedUi()?.cell,
}))
const positionerPart = computed(() =>
  resolveUiPart(cx, themedUi()?.positioner, 'ui-select-positioner', 'ui-date-picker-positioner'),
)
const panelPart = computed(() =>
  resolveUiPart(cx, themedUi()?.panel, 'ui-select-panel', 'ui-date-picker-panel'),
)

const resolvedSide = computed(() => placement.value.split('-')[0] as DatePickerSide)
const resolvedAlign = computed<DatePickerAlign>(() => {
  const align = placement.value.split('-')[1]
  return align === 'start' || align === 'end' ? align : 'center'
})

defineExpose({
  el,
  inputEl,
  panelEl,
  positionerEl,
  placement,
  positionerStyle,
  isClosing,
  open: () => {
    if (!isDisabled.value) open.value = true
  },
  close,
  cancelClose,
})
</script>
