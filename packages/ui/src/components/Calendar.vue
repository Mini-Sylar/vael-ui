<template>
  <div
    ref="rootEl"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-motion="motionCss ? undefined : 'off'"
  >
    <div :class="headerPart.class" :style="headerPart.style">
      <button
        type="button"
        :class="navButtonPart.class"
        :style="navButtonPart.style"
        :aria-label="previousLabel"
        @click="goPrevious"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
          <path
            d="M10 4l-4 4 4 4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <button
        v-if="canDrill"
        type="button"
        :class="[labelPart.class, 'ui-calendar-label--button']"
        :style="labelPart.style"
        aria-live="polite"
        @click="drillUp"
      >
        {{ headerLabel }}
      </button>
      <span v-else :class="labelPart.class" :style="labelPart.style" aria-live="polite">{{
        headerLabel
      }}</span>
      <button
        type="button"
        :class="navButtonPart.class"
        :style="navButtonPart.style"
        :aria-label="nextLabel"
        @click="goNext"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
          <path
            d="M6 4l4 4-4 4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <div class="ui-calendar-body" :style="{ '--ui-calendar-direction': direction }">
      <template v-if="navLevel === 'date'">
        <div :class="weekdaysPart.class" :style="weekdaysPart.style" aria-hidden="true">
          <span
            v-for="(label, i) in weekdayLabels"
            :key="i"
            :class="weekdayPart.class"
            :style="weekdayPart.style"
          >
            {{ label }}
          </span>
        </div>

        <div class="ui-calendar-grid-wrap">
          <Transition :name="motionCss ? 'ui-calendar-grid' : undefined" :css="motionCss">
            <div
              :key="monthKey"
              ref="gridEl"
              role="grid"
              :aria-label="headerLabel"
              :class="gridPart.class"
              :style="gridPart.style"
              @keydown="onGridKeydown"
            >
              <div v-for="(week, wi) in weeks" :key="wi" role="row" class="ui-calendar-week">
                <div
                  v-for="day in week"
                  :key="isoDate(day)"
                  role="gridcell"
                  :data-date="isoDate(day)"
                  :tabindex="isSameDay(day, focusedDate) ? 0 : -1"
                  :aria-selected="isDaySelected(day) || undefined"
                  :aria-current="isToday(day) ? 'date' : undefined"
                  :aria-disabled="isDayDisabled(day) || undefined"
                  :aria-label="cellLabel(day)"
                  :class="cellPart(day).class"
                  :style="cellPart(day).style"
                  @click="onDayClick(day)"
                  @pointerenter="onDayHover(day)"
                >
                  {{ day.getDate() }}
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </template>

      <template v-else-if="navLevel === 'month'">
        <Transition :name="motionCss ? 'ui-calendar-grid' : undefined" :css="motionCss">
          <div
            :key="`m${viewDate.getFullYear()}`"
            role="grid"
            :aria-label="headerLabel"
            class="ui-calendar-month-grid"
          >
            <div v-for="(row, ri) in monthRows" :key="ri" role="row" class="ui-calendar-month-row">
              <div
                v-for="month in row"
                :key="month.getMonth()"
                role="gridcell"
                tabindex="0"
                :aria-selected="isMonthSelected(month) || undefined"
                :aria-disabled="isMonthDisabled(month) || undefined"
                class="ui-calendar-month-cell"
                :class="{
                  'ui-calendar-month-cell--selected': isMonthSelected(month),
                  'ui-calendar-month-cell--disabled': isMonthDisabled(month),
                }"
                @click="onMonthPick(month)"
                @keydown.enter="onMonthPick(month)"
                @keydown.space.prevent="onMonthPick(month)"
              >
                {{ monthLabel(month) }}
              </div>
            </div>
          </div>
        </Transition>
      </template>

      <template v-else>
        <Transition :name="motionCss ? 'ui-calendar-grid' : undefined" :css="motionCss">
          <div
            :key="`y${yearWindowStart}`"
            role="grid"
            :aria-label="headerLabel"
            class="ui-calendar-year-grid"
          >
            <div v-for="(row, ri) in yearRows" :key="ri" role="row" class="ui-calendar-year-row">
              <div
                v-for="year in row"
                :key="year"
                role="gridcell"
                tabindex="0"
                :aria-selected="isYearSelected(year) || undefined"
                :aria-disabled="isYearDisabled(year) || undefined"
                class="ui-calendar-year-cell"
                :class="{
                  'ui-calendar-year-cell--selected': isYearSelected(year),
                  'ui-calendar-year-cell--disabled': isYearDisabled(year),
                }"
                @click="onYearPick(year)"
                @keydown.enter="onYearPick(year)"
                @keydown.space.prevent="onYearPick(year)"
              >
                {{ year }}
              </div>
            </div>
          </div>
        </Transition>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
export type CalendarDisabledDates = Date[] | ((date: Date) => boolean)

export interface CalendarRange {
  start: Date | null
  end: Date | null
}

export type CalendarSelectionMode = 'single' | 'range'
export type CalendarView = 'date' | 'month' | 'year'
</script>

<!-- Calendar extracts grid logic for standalone use; DatePicker wraps it in popover.
     Model: `Date | CalendarRange | null`, never ISO strings (timezone footguns).
     Range: two-click state machine; landing before start restarts (no silent swap).
     view vs navLevel: view is prop granularity; navLevel can drill up/down temporarily.
     Keyboard (date): ARIA APG pattern with roving focusedDate; Month/year grids use Tab between tabindex="0" cells.
     Month transition: grid re-keys inside Transition, slides by --ui-calendar-direction. motionCss=false disables. -->
<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'

const model = defineModel<Date | CalendarRange | null>({ default: null })

const props = withDefaults(
  defineProps<{
    selectionMode?: CalendarSelectionMode
    view?: CalendarView
    minDate?: Date
    maxDate?: Date
    /** List of unavailable dates, or a predicate function. Matched by calendar day, ignoring time. */
    disabledDates?: CalendarDisabledDates
    /** BCP-47 locale for month/weekday names and week start day. Omitted uses runtime default. */
    locale?: string
    /** 0 (Sunday) – 6 (Saturday). Omitted derives from `locale`, falling back to Sunday. */
    firstDayOfWeek?: number
    /** `false` skips month-navigation slide transition. */
    motionCss?: boolean
    ui?: Partial<{
      root: UiPartValue
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
    minDate: undefined,
    maxDate: undefined,
    disabledDates: undefined,
    locale: undefined,
    firstDayOfWeek: undefined,
    motionCss: true,
    ui: undefined,
  },
)

const emit = defineEmits<{
  change: [value: Date | CalendarRange | null]
  /** Fires when the displayed month changes (nav buttons, keyboard, or clicking adjacent month's day). */
  'month-change': [value: Date]
}>()

// Pure date helpers: no date library dependency, native Date math only
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}
// Clamps rather than overflows — Jan 31 + 1 month -> Feb 28/29, not March
function addMonths(date: Date, n: number): Date {
  const day = date.getDate()
  const d = new Date(date.getFullYear(), date.getMonth(), 1)
  d.setMonth(d.getMonth() + n)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return d
}
function addYears(date: Date, n: number): Date {
  return addMonths(date, n * 12)
}
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}
function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}
function startOfWeek(date: Date, firstDay: number): Date {
  const diff = (date.getDay() - firstDay + 7) % 7
  return addDays(startOfDay(date), -diff)
}
function endOfWeek(date: Date, firstDay: number): Date {
  return addDays(startOfWeek(date, firstDay), 6)
}
function pad2(n: number): string {
  return String(n).padStart(2, '0')
}
function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

// Intl.Locale.weekInfo not in every engine; fallback to Sunday.
function resolveFirstDayOfWeek(locale: string | undefined): number {
  try {
    const resolvedLocale = locale ?? Intl.DateTimeFormat().resolvedOptions().locale
    const info = (new Intl.Locale(resolvedLocale) as unknown as { weekInfo?: { firstDay: number } })
      .weekInfo
    if (info?.firstDay) return info.firstDay % 7
  } catch {}
  return 0
}

const today = startOfDay(new Date())

function isRange(value: Date | CalendarRange | null): value is CalendarRange {
  return value != null && typeof value === 'object' && 'start' in value
}
function initialAnchor(): Date {
  if (!model.value) return today
  return isRange(model.value) ? (model.value.start ?? model.value.end ?? today) : model.value
}

const viewDate = ref<Date>(startOfMonth(initialAnchor()))
// 1 = forward, -1 = backward; drives month-transition slide direction.
const direction = ref(1)
const focusedDate = ref<Date>(initialAnchor())
const navLevel = ref<CalendarView>(props.view)
const hoveredDate = ref<Date | null>(null)

const resolvedFirstDay = computed(() => props.firstDayOfWeek ?? resolveFirstDayOfWeek(props.locale))

const gridStart = computed(() => startOfWeek(startOfMonth(viewDate.value), resolvedFirstDay.value))
const gridEnd = computed(() => endOfWeek(endOfMonth(viewDate.value), resolvedFirstDay.value))
const weeks = computed<Date[][]>(() => {
  const out: Date[][] = []
  let cursor = gridStart.value
  while (cursor <= gridEnd.value) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(cursor)
      cursor = addDays(cursor, 1)
    }
    out.push(week)
  }
  return out
})
const monthKey = computed(() => `${viewDate.value.getFullYear()}-${viewDate.value.getMonth()}`)

// Month/year grid data
const monthsInYear = computed<Date[]>(() =>
  Array.from({ length: 12 }, (_, i) => new Date(viewDate.value.getFullYear(), i, 1)),
)
const monthRows = computed<Date[][]>(() => {
  const out: Date[][] = []
  for (let i = 0; i < 12; i += 4) out.push(monthsInYear.value.slice(i, i + 4))
  return out
})
// 12-year window with viewDate year centered in 2nd row.
const yearWindowStart = computed(
  () => viewDate.value.getFullYear() - (viewDate.value.getFullYear() % 12) - 4,
)
const yearsInWindow = computed<number[]>(() =>
  Array.from({ length: 12 }, (_, i) => yearWindowStart.value + i),
)
const yearRows = computed<number[][]>(() => {
  const out: number[][] = []
  for (let i = 0; i < 12; i += 4) out.push(yearsInWindow.value.slice(i, i + 4))
  return out
})

const canDrill = computed(() => navLevel.value !== 'year')

const monthYearLabel = computed(() =>
  new Intl.DateTimeFormat(props.locale, { month: 'long', year: 'numeric' }).format(viewDate.value),
)
const yearLabel = computed(() => String(viewDate.value.getFullYear()))
const yearRangeLabel = computed(
  () => `${yearsInWindow.value[0]} – ${yearsInWindow.value[yearsInWindow.value.length - 1]}`,
)
const headerLabel = computed(() => {
  if (navLevel.value === 'date') return monthYearLabel.value
  if (navLevel.value === 'month') return yearLabel.value
  return yearRangeLabel.value
})
const previousLabel = computed(() =>
  navLevel.value === 'date'
    ? 'Previous month'
    : navLevel.value === 'month'
      ? 'Previous year'
      : 'Previous years',
)
const nextLabel = computed(() =>
  navLevel.value === 'date'
    ? 'Next month'
    : navLevel.value === 'month'
      ? 'Next year'
      : 'Next years',
)

const weekdayLabels = computed(() => {
  const formatter = new Intl.DateTimeFormat(props.locale, { weekday: 'short' })
  return (weeks.value[0] ?? []).map((day) => formatter.format(day))
})
function cellLabel(day: Date): string {
  return new Intl.DateTimeFormat(props.locale, { dateStyle: 'full' }).format(day)
}
function monthLabel(month: Date): string {
  return new Intl.DateTimeFormat(props.locale, { month: 'short' }).format(month)
}

function isToday(day: Date): boolean {
  return isSameDay(day, today)
}
function isDaySelected(day: Date): boolean {
  if (!model.value) return false
  if (isRange(model.value)) {
    return (
      (model.value.start != null && isSameDay(day, model.value.start)) ||
      (model.value.end != null && isSameDay(day, model.value.end))
    )
  }
  return isSameDay(day, model.value)
}
function isDayDisabled(day: Date): boolean {
  if (props.minDate && day < startOfDay(props.minDate)) return true
  if (props.maxDate && day > startOfDay(props.maxDate)) return true
  const disabled = props.disabledDates
  if (!disabled) return false
  if (typeof disabled === 'function') return disabled(day)
  return disabled.some((d) => isSameDay(d, day))
}
// The range's real committed bounds, OR (mid-selection, pointer hovering) a
// live preview of what completing the range at `hoveredDate` would look
// like — the same value either way once `end` is committed.
function rangeBounds(): { start: Date; end: Date } | null {
  if (!isRange(model.value) || !model.value.start) return null
  const start = model.value.start
  if (model.value.end) {
    return start <= model.value.end
      ? { start, end: model.value.end }
      : { start: model.value.end, end: start }
  }
  if (hoveredDate.value) {
    return hoveredDate.value >= start
      ? { start, end: hoveredDate.value }
      : { start: hoveredDate.value, end: start }
  }
  return null
}
function isDayInRange(day: Date): boolean {
  const bounds = rangeBounds()
  if (!bounds) return false
  return day > startOfDay(bounds.start) && day < startOfDay(bounds.end)
}
function isRangeStart(day: Date): boolean {
  return isRange(model.value) && model.value.start != null && isSameDay(day, model.value.start)
}
function isRangeEnd(day: Date): boolean {
  return isRange(model.value) && model.value.end != null && isSameDay(day, model.value.end)
}

function monthDisabledCheck(month: Date): boolean {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  if (props.maxDate && start > startOfDay(props.maxDate)) return true
  if (props.minDate && end < startOfDay(props.minDate)) return true
  return false
}
function isMonthDisabled(month: Date): boolean {
  return monthDisabledCheck(month)
}
function isMonthSelected(month: Date): boolean {
  if (props.view !== 'month' || !model.value || isRange(model.value)) return false
  return isSameMonth(month, model.value)
}
function isYearDisabled(year: number): boolean {
  if (props.maxDate && new Date(year, 0, 1) > startOfDay(props.maxDate)) return true
  if (props.minDate && new Date(year, 11, 31) < startOfDay(props.minDate)) return true
  return false
}
function isYearSelected(year: number): boolean {
  if (props.view !== 'year' || !model.value || isRange(model.value)) return false
  return model.value.getFullYear() === year
}

// Navigation
function setView(date: Date, dir: 1 | -1) {
  direction.value = dir
  viewDate.value = navLevel.value === 'date' ? startOfMonth(date) : date
  if (navLevel.value === 'date') emit('month-change', startOfMonth(date))
}
function goPrevious() {
  if (navLevel.value === 'date') setView(addMonths(viewDate.value, -1), -1)
  else if (navLevel.value === 'month') setView(addYears(viewDate.value, -1), -1)
  else setView(addYears(viewDate.value, -12), -1)
}
function goNext() {
  if (navLevel.value === 'date') setView(addMonths(viewDate.value, 1), 1)
  else if (navLevel.value === 'month') setView(addYears(viewDate.value, 1), 1)
  else setView(addYears(viewDate.value, 12), 1)
}
// Header-label click: temporarily drill up to coarser level for fast nav
function drillUp() {
  if (navLevel.value === 'date') navLevel.value = 'month'
  else if (navLevel.value === 'month') navLevel.value = 'year'
}

function commitSingle(day: Date) {
  if (isDayDisabled(day)) return
  const value = startOfDay(day)
  model.value = value
  emit('change', value)
}
function commitRange(day: Date) {
  if (isDayDisabled(day)) return
  const value = startOfDay(day)
  const current = isRange(model.value) ? model.value : { start: null, end: null }
  let next: CalendarRange
  if (!current.start || (current.start && current.end)) {
    next = { start: value, end: null }
  } else if (value < current.start) {
    next = { start: value, end: null }
  } else {
    next = { start: current.start, end: value }
  }
  model.value = next
  emit('change', next)
}
function selectDate(day: Date) {
  if (props.selectionMode === 'range') commitRange(day)
  else commitSingle(day)
}
function onDayClick(day: Date) {
  focusedDate.value = day
  if (!isSameMonth(day, viewDate.value)) setView(day, day > viewDate.value ? 1 : -1)
  selectDate(day)
}
function onDayHover(day: Date) {
  if (props.selectionMode === 'range') hoveredDate.value = day
}

function onMonthPick(month: Date) {
  if (isMonthDisabled(month)) return
  if (props.view === 'month') {
    const value = startOfMonth(month)
    model.value = value
    emit('change', value)
    return
  }
  viewDate.value = startOfMonth(month)
  navLevel.value = 'date'
  emit('month-change', viewDate.value)
}
function onYearPick(year: number) {
  if (isYearDisabled(year)) return
  if (props.view === 'year') {
    const value = new Date(year, 0, 1)
    model.value = value
    emit('change', value)
    return
  }
  // Only reachable when view is 'date' or 'month' (view === 'year' already
  // returned above) — either way the next stop is the month grid, either to
  // let the user pick a month to descend into (view: 'date') or because
  // month IS the target granularity (view: 'month').
  viewDate.value = new Date(year, viewDate.value.getMonth(), 1)
  navLevel.value = 'month'
}

const rootEl = useTemplateRef<HTMLElement>('rootEl')
const gridEl = useTemplateRef<HTMLElement>('gridEl')

function focusCellEl(day: Date) {
  gridEl.value?.querySelector<HTMLElement>(`[data-date="${isoDate(day)}"]`)?.focus()
}
function moveFocus(day: Date) {
  focusedDate.value = day
  if (!isSameMonth(day, viewDate.value)) setView(day, day > viewDate.value ? 1 : -1)
  nextTick(() => focusCellEl(day))
}
/** Roving-tabindex to a specific day; only resets navLevel to 'date' if that view exists. */
function focusDay(day: Date) {
  navLevel.value = props.view
  if (props.view !== 'date') return
  moveFocus(day)
}

function onGridKeydown(event: KeyboardEvent) {
  let next: Date | null = null
  // ARIA APG keyboard nav: arrow keys move focus, Enter/Space select.
  switch (event.key) {
    case 'ArrowLeft':
      next = addDays(focusedDate.value, -1)
      break
    case 'ArrowRight':
      next = addDays(focusedDate.value, 1)
      break
    case 'ArrowUp':
      next = addDays(focusedDate.value, -7)
      break
    case 'ArrowDown':
      next = addDays(focusedDate.value, 7)
      break
    case 'Home':
      next = startOfWeek(focusedDate.value, resolvedFirstDay.value)
      break
    case 'End':
      next = endOfWeek(focusedDate.value, resolvedFirstDay.value)
      break
    case 'PageUp':
      next = event.shiftKey ? addYears(focusedDate.value, -1) : addMonths(focusedDate.value, -1)
      break
    case 'PageDown':
      next = event.shiftKey ? addYears(focusedDate.value, 1) : addMonths(focusedDate.value, 1)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      selectDate(focusedDate.value)
      return
    default:
      return
  }
  event.preventDefault()
  moveFocus(next)
}

watch(model, (value) => {
  if (!value) return
  const anchor = isRange(value) ? (value.end ?? value.start) : value
  if (!anchor) return
  focusedDate.value = anchor
  if (navLevel.value === 'date' && !isSameMonth(anchor, viewDate.value))
    viewDate.value = startOfMonth(anchor)
})

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.calendar,
  () => props.ui,
)

const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-calendar-root'))
const headerPart = computed(() => resolveUiPart(cx, themedUi()?.header, 'ui-calendar-header'))
const navButtonPart = computed(() => resolveUiPart(cx, themedUi()?.navButton, 'ui-calendar-nav'))
const labelPart = computed(() => resolveUiPart(cx, themedUi()?.label, 'ui-calendar-label'))
const weekdaysPart = computed(() => resolveUiPart(cx, themedUi()?.weekdays, 'ui-calendar-weekdays'))
const weekdayPart = computed(() => resolveUiPart(cx, themedUi()?.weekday, 'ui-calendar-weekday'))
const gridPart = computed(() => resolveUiPart(cx, themedUi()?.grid, 'ui-calendar-grid'))
function cellPart(day: Date) {
  return resolveUiPart(
    cx,
    themedUi()?.cell,
    'ui-calendar-cell',
    !isSameMonth(day, viewDate.value) && 'ui-calendar-cell--outside',
    isToday(day) && 'ui-calendar-cell--today',
    isDaySelected(day) && 'ui-calendar-cell--selected',
    isDayDisabled(day) && 'ui-calendar-cell--disabled',
    props.selectionMode === 'range' && isRangeStart(day) && 'ui-calendar-cell--range-start',
    props.selectionMode === 'range' && isRangeEnd(day) && 'ui-calendar-cell--range-end',
    props.selectionMode === 'range' && isDayInRange(day) && 'ui-calendar-cell--in-range',
  )
}

defineExpose({
  rootEl,
  gridEl,
  goToPreviousMonth: goPrevious,
  goToNextMonth: goNext,
  focusDay,
})
</script>
