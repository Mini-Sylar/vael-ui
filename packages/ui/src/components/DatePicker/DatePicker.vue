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
          :aria-label="messages.datePicker.chooseDate"
          :class="panelPart.class"
          :style="[{ transformOrigin }, panelPart.style]"
          v-bind="$attrs"
        >
          <Calendar
            v-if="!timeOnlyEffective"
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
          <div
            v-if="(showTime || timeOnly) && selectionMode !== 'range'"
            :class="timePart.class"
            :style="timePart.style"
          >
            <TimeField
              ref="hourFieldRef"
              v-model="hourDisplay"
              :min="resolvedHour12 ? 1 : 0"
              :max="resolvedHour12 ? 12 : 23"
              :label="messages.datePicker.hour"
              :inc-label="messages.datePicker.increaseHour"
              :dec-label="messages.datePicker.decreaseHour"
            />
            <span class="ui-date-picker-time-sep" aria-hidden="true">:</span>
            <TimeField
              v-model="minuteValue"
              :min="0"
              :max="59"
              :step="minuteStep"
              :label="messages.datePicker.minute"
              :inc-label="messages.datePicker.increaseMinute"
              :dec-label="messages.datePicker.decreaseMinute"
            />
            <SelectButton
              v-if="resolvedHour12"
              class="ui-date-picker-ampm"
              size="sm"
              :items="ampmItems"
              :model-value="isPM ? 'PM' : 'AM'"
              :allow-empty="false"
              @update:model-value="onAmPmChange"
            />
          </div>
          <div
            v-if="showButtonBar || $slots.footer"
            :class="footerPart.class"
            :style="footerPart.style"
          >
            <slot name="footer">
              <Button
                v-if="selectionMode !== 'range'"
                class="ui-date-picker-today"
                size="sm"
                variant="ghost"
                @click="todayClick"
              >
                {{ messages.datePicker.today }}
              </Button>
              <Button size="sm" variant="ghost" @click="clearClick">
                {{ messages.datePicker.clear }}
              </Button>
            </slot>
          </div>
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
import { useUiMessages } from '../../messages'
import Input from '../Input/Input.vue'
import Button from '../Button/Button.vue'
import SelectButton from '../SelectButton/SelectButton.vue'
import Calendar from '../Calendar/Calendar.vue'
import TimeField from '../internal/TimeField.vue'
import type {
  CalendarDisabledDates,
  CalendarRange,
  CalendarSelectionMode,
  CalendarView,
} from '../Calendar/Calendar.vue'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const messages = useUiMessages()

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
    /** Built-in Today (single mode only) / Clear buttons below the calendar. Ignored — the
     * `#footer` slot always renders instead — once that slot is provided. */
    showButtonBar?: boolean
    /** Adds an hour/minute row below the calendar. `single` selection mode only — a range's two
     * endpoints each having their own time isn't supported here. Keeps the popover open on a date
     * pick instead of auto-closing, since there's still time left to set. */
    showTime?: boolean
    /** Hides the calendar entirely — just the time row. Implies `showTime`. */
    timeOnly?: boolean
    /** `'12'` adds an AM/PM toggle; `'24'` doesn't. Default: resolved from `locale` (or the
     * runtime default) via `Intl`'s own `hour12` resolution — an explicit value always wins. */
    hourFormat?: '12' | '24'
    /** Minute increment for the arrow-key/stepper-button adjustments. Default: 1. */
    minuteStep?: number
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
      time: UiPartValue
      footer: UiPartValue
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
    showButtonBar: false,
    showTime: false,
    timeOnly: false,
    hourFormat: undefined,
    minuteStep: 1,
    ui: undefined,
  },
)

const emit = defineEmits<{
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
  change: [value: Date | CalendarRange | null]
  'month-change': [value: Date]
}>()

defineSlots<{
  /** Replaces the built-in Today/Clear button bar entirely — shown whenever this slot is
   * provided, regardless of `showButtonBar`. */
  footer(): unknown
}>()

function todayClick() {
  const value = new Date()
  model.value = value
  emit('change', value)
  close()
}
function clearClick() {
  model.value = null
  emit('change', null)
  close()
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}
function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

// `timeOnly` has no meaning in range mode (time isn't supported there at all) — without this,
// both the calendar AND the time row would fail their own `v-if`, leaving a genuinely empty
// panel rather than falling back to something usable.
const timeOnlyEffective = computed(() => props.timeOnly && props.selectionMode !== 'range')

// `true`/`false` always win; otherwise ask Intl what the locale itself defaults to, same
// spirit as Calendar already deferring month/weekday names to `locale`.
const resolvedHour12 = computed(() => {
  if (props.hourFormat === '12') return true
  if (props.hourFormat === '24') return false
  return (
    new Intl.DateTimeFormat(props.locale, { hour: 'numeric' }).resolvedOptions().hour12 ?? false
  )
})

// `dateStyle`/`timeStyle` can't be combined with individual `hour`/`minute`/`hour12` in one
// Intl.DateTimeFormat (throws) — so date and time are two separate formatters, concatenated,
// rather than one options object trying to do both.
const explicitFormatter = computed(() =>
  props.formatOptions ? new Intl.DateTimeFormat(props.locale, props.formatOptions) : null,
)
const dateFormatter = computed(() => {
  if (explicitFormatter.value) return explicitFormatter.value
  if (props.view === 'year') return new Intl.DateTimeFormat(props.locale, { year: 'numeric' })
  if (props.view === 'month') {
    return new Intl.DateTimeFormat(props.locale, { month: 'long', year: 'numeric' })
  }
  return new Intl.DateTimeFormat(props.locale, { dateStyle: 'medium' })
})
const timeFormatter = computed(
  () =>
    new Intl.DateTimeFormat(props.locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: resolvedHour12.value,
    }),
)
function formatOne(date: Date): string {
  if (explicitFormatter.value) return explicitFormatter.value.format(date)
  if (props.timeOnly) return timeFormatter.value.format(date)
  if (!props.showTime) return dateFormatter.value.format(date)
  return `${dateFormatter.value.format(date)}, ${timeFormatter.value.format(date)}`
}
const displayValue = computed(() => {
  const value = model.value
  if (!value) return ''
  if (isRangeModel(value)) {
    if (!value.start) return ''
    const startText = dateFormatter.value.format(value.start)
    if (!value.end) return `${startText} – …`
    return `${startText} – ${dateFormatter.value.format(value.end)}`
  }
  return formatOne(value)
})

// Time state reads/writes straight off `model` — a JS Date already carries hour/minute, so
// there's no separate time model to keep in sync, just this Date's own setHours.
const timeBase = computed<Date>(() => {
  const value = model.value
  return value == null || isRangeModel(value) ? new Date() : value
})
function commitTime(hour24: number, minute: number) {
  const next = new Date(timeBase.value)
  next.setHours(hour24, minute, 0, 0)
  model.value = next
  emit('change', next)
}
const hour24 = computed(() => timeBase.value.getHours())
const isPM = computed(() => hour24.value >= 12)
const minuteValue = computed({
  get: () => timeBase.value.getMinutes(),
  set: (value) => commitTime(hour24.value, value),
})
const hourDisplay = computed({
  get: () => {
    if (!resolvedHour12.value) return hour24.value
    const h = hour24.value % 12
    return h === 0 ? 12 : h
  },
  set: (value) => {
    if (!resolvedHour12.value) {
      commitTime(value, minuteValue.value)
      return
    }
    commitTime((value % 12) + (isPM.value ? 12 : 0), minuteValue.value)
  },
})
// Locale-correct AM/PM text (some locales don't use literal "AM"/"PM") — format a known
// morning and evening hour and read back whatever Intl actually calls each period.
const dayPeriodLabels = computed(() => {
  const fmt = new Intl.DateTimeFormat(props.locale, { hour: 'numeric', hour12: true })
  const partAt = (hour: number) =>
    fmt.formatToParts(new Date(2000, 0, 1, hour)).find((p) => p.type === 'dayPeriod')?.value
  return { am: partAt(9) ?? 'AM', pm: partAt(21) ?? 'PM' }
})
const ampmItems = computed(() => [
  { label: dayPeriodLabels.value.am, value: 'AM' },
  { label: dayPeriodLabels.value.pm, value: 'PM' },
])
function onAmPmChange(value: string | number | (string | number)[] | null) {
  const wantPM = value === 'PM'
  if (wantPM === isPM.value) return
  commitTime(wantPM ? hour24.value + 12 : hour24.value - 12, minuteValue.value)
}

function onCalendarChange(value: Date | CalendarRange | null) {
  emit('change', value)
  // Range mode: don't auto-close until both endpoints are committed.
  if (isRangeModel(value) && !value.end) return
  // showTime: stay open — there's still a time to set after the date.
  if (props.showTime && !isRangeModel(value)) return
  close()
}

const inputRef = useTemplateRef('inputRef')
const el = computed(() => inputRef.value?.el ?? null)
const inputEl = computed(() => inputRef.value?.inputEl ?? null)
const positionerEl = useTemplateRef<HTMLElement>('positioner')
const panelEl = useTemplateRef<HTMLElement>('panel')
const calendarRef = useTemplateRef<InstanceType<typeof Calendar>>('calendarRef')
const hourFieldRef = useTemplateRef<InstanceType<typeof TimeField>>('hourFieldRef')

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
    if (timeOnlyEffective.value) {
      nextTick(() => hourFieldRef.value?.inputEl?.focus())
      return
    }
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
const footerPart = computed(() =>
  resolveUiPart(cx, themedUi()?.footer, 'ui-select-footer', 'ui-date-picker-footer'),
)
const timePart = computed(() => resolveUiPart(cx, themedUi()?.time, 'ui-date-picker-time'))

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
