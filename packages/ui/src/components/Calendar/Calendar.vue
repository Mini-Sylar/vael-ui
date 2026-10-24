<template>
  <div
    ref="rootEl"
    :class="[rootPart.class, showWeekNumbers && 'ui-calendar-root--week-numbers']"
    :style="rootPart.style"
    :data-motion="motionOn ? undefined : 'off'"
  >
    <div
      :class="[
        headerPart.class,
        splitMonths && 'ui-calendar-header--overlay',
        yearButtons && 'ui-calendar-header--year-nav',
      ]"
      :style="[{ '--ui-calendar-direction': direction }, headerPart.style]"
    >
      <button
        v-if="yearButtons"
        type="button"
        :class="navButtonPart.class"
        :style="navButtonPart.style"
        :aria-label="messages.calendar.previousYear"
        :aria-disabled="!canGoPrevious || undefined"
        @click="goPreviousYear"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
          <path
            d="M8 4l-4 4 4 4M12.5 4l-4 4 4 4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        :class="navButtonPart.class"
        :style="navButtonPart.style"
        :aria-label="previousLabel"
        :aria-disabled="!canGoPrevious || undefined"
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
      <!-- Stays a button at the top level (aria-disabled), so focus isn't
           dropped when drilling up to the year grid. -->
      <button
        v-if="!splitMonths"
        ref="labelButton"
        type="button"
        :class="[labelPart.class, canDrill && 'ui-calendar-label--button']"
        :style="labelPart.style"
        :aria-disabled="!canDrill || undefined"
        aria-live="polite"
        @pointerenter="titleIfCut"
        @click="canDrill && drillUp()"
      >
        <Transition v-bind="labelTransition">
          <span :key="headerLabel" class="ui-calendar-label-text">
            <slot name="label" :label="headerLabel" :date="viewDate" :level="navLevel">{{
              headerLabel
            }}</slot>
          </span>
        </Transition>
      </button>
      <button
        type="button"
        :class="navButtonPart.class"
        :style="navButtonPart.style"
        :aria-label="nextLabel"
        :aria-disabled="!canGoNext || undefined"
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
      <button
        v-if="yearButtons"
        type="button"
        :class="navButtonPart.class"
        :style="navButtonPart.style"
        :aria-label="messages.calendar.nextYear"
        :aria-disabled="!canGoNext || undefined"
        @click="goNextYear"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
          <path
            d="M3.5 4l4 4-4 4M8 4l4 4-4 4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <div
      ref="bodyEl"
      class="ui-calendar-body"
      :style="[{ '--ui-calendar-direction': direction }, bodyMinSize]"
      :data-zoom="zoom"
    >
      <div
        ref="hoverEl"
        class="ui-indicator ui-indicator--grid ui-calendar-hover"
        :style="hoverStyle"
        aria-hidden="true"
      />
      <Transition
        :name="motionOn ? 'ui-calendar-level' : undefined"
        :css="motionOn"
        @enter="anchorZoom"
      >
        <div :key="navLevel" class="ui-calendar-level">
          <div
            v-if="navLevel === 'date'"
            :class="[
              'ui-calendar-panes',
              yearButtons &&
                (splitMonths ? 'ui-calendar-panes--year-nav-split' : 'ui-calendar-panes--year-nav'),
            ]"
          >
            <div v-for="(pane, pi) in panes" :key="pi" class="ui-calendar-pane">
              <div v-if="panes.length > 1" class="ui-calendar-pane-head">
                <Transition v-bind="labelTransition">
                  <button
                    :key="monthKeyOf(pane)"
                    type="button"
                    :class="[
                      labelPart.class,
                      'ui-calendar-label--button',
                      'ui-calendar-pane-label',
                    ]"
                    :style="labelPart.style"
                    aria-live="polite"
                    @pointerenter="titleIfCut"
                    @click="drillUp(pane, pi)"
                  >
                    <slot name="label" :label="monthYearFormat(pane)" :date="pane" level="date">{{
                      monthYearFormat(pane)
                    }}</slot>
                  </button>
                </Transition>
              </div>
              <div :class="weekdaysPart.class" :style="weekdaysPart.style" aria-hidden="true">
                <span v-if="showWeekNumbers" class="ui-calendar-week-number" />
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
                <Transition v-bind="gridTransition">
                  <div
                    :key="monthKeyOf(pane)"
                    :ref="(el) => pi === 0 && setGridEl(el)"
                    role="grid"
                    :aria-label="monthYearFormat(pane)"
                    :class="gridPart.class"
                    :style="gridPart.style"
                    @keydown="onGridKeydown"
                  >
                    <div
                      v-for="(week, wi) in weeksOf(pane)"
                      :key="wi"
                      role="row"
                      class="ui-calendar-week"
                    >
                      <div
                        v-if="showWeekNumbers"
                        role="rowheader"
                        class="ui-calendar-week-number"
                        :aria-label="weekLabel(week)"
                      >
                        {{ isoWeek(week) }}
                      </div>
                      <div
                        v-for="day in week"
                        :key="isoDate(day)"
                        role="gridcell"
                        v-bind="dayAttrs(day, pane)"
                        :class="cellPart(day, pane).class"
                        :style="cellPart(day, pane).style"
                        @click="onDayClick(day)"
                        @pointerenter="onDayHover(day)"
                      >
                        <!-- Custom day content is read after the date, not hidden behind an aria-label. -->
                        <span
                          v-if="$slots.day && !isBlank(day, pane)"
                          class="ui-calendar-cell-label"
                          >{{ cellLabel(day) }}</span
                        >
                        <slot
                          name="day"
                          :date="day"
                          :is-current-month="isSameMonth(day, pane)"
                          :is-today="isToday(day)"
                          :is-selected="isDaySelected(day)"
                          :is-disabled="isDayDisabled(day)"
                          >{{ day.getDate() }}</slot
                        >
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </div>

          <template v-else-if="navLevel === 'month'">
            <Transition v-bind="gridTransition">
              <div
                :key="`m${viewDate.getFullYear()}`"
                role="grid"
                :aria-label="headerLabel"
                class="ui-calendar-month-grid"
                @keydown="onMonthKeydown"
              >
                <div
                  v-for="(row, ri) in monthRows"
                  :key="ri"
                  role="row"
                  class="ui-calendar-month-row"
                >
                  <div
                    v-for="month in row"
                    :key="month.getMonth()"
                    :data-month="month.getMonth()"
                    role="gridcell"
                    :tabindex="month.getMonth() === viewDate.getMonth() ? 0 : -1"
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
            <Transition v-bind="gridTransition">
              <div
                :key="`y${yearWindowStart}`"
                role="grid"
                :aria-label="headerLabel"
                class="ui-calendar-year-grid"
                @keydown="onYearKeydown"
              >
                <div
                  v-for="(row, ri) in yearRows"
                  :key="ri"
                  role="row"
                  class="ui-calendar-year-row"
                >
                  <div
                    v-for="year in row"
                    :key="year"
                    :data-year="year"
                    role="gridcell"
                    :tabindex="year === yearStop ? 0 : -1"
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
      </Transition>
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
     Keyboard: ARIA APG grid pattern, one roving tab stop per level (focusedDate, viewDate's month, focusedYear).
     Month transition: grid re-keys inside Transition, slides by --ui-calendar-direction. motion=false disables. -->
<script setup lang="ts">
import { inlineKey, prefersReducedMotion } from '../../composables/dom'
import './Calendar.css'
import '../shared/indicator.css'
import { useHoverIndicator } from '../../composables/useHoverIndicator'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import {
  computed,
  nextTick,
  onMounted,
  ref,
  shallowRef,
  useSlots,
  useTemplateRef,
  watch,
} from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useSwapMotion } from '../../motion/useSwapMotion'
import type { CalendarMotion } from '../../motion/types'
import { useUiMessages } from '../../messages'

/** Selected date, or `{ start, end }` in `range` mode. @default null */
const model = defineModel<Date | CalendarRange | null>({ default: null })

const rawProps = withDefaults(
  defineProps<{
    /**
     * `'range'` picks a start then an end; clicking before the start restarts the range.
     * @default 'single'
     */
    selectionMode?: CalendarSelectionMode
    /** What a click selects: a day, a month (its 1st) or a year (January 1st). @default 'date' */
    view?: CalendarView
    /** Earliest selectable date (inclusive); the calendar disables earlier days, months and years. */
    minDate?: Date
    /** Latest selectable date (inclusive); the calendar disables later days, months and years. */
    maxDate?: Date
    /** List of unavailable dates, or a predicate function. Matching compares calendar days and ignores time. */
    disabledDates?: CalendarDisabledDates
    /** BCP-47 locale for month and weekday names and the week start day. Unset, it uses the runtime default. */
    locale?: string
    /** `0` (Sunday) to `6` (Saturday). Unset, it derives from `locale` and falls back to Monday. */
    firstDayOfWeek?: number
    /**
     * How many months to show side by side, for picking a range at a glance. They move together
     * and wrap onto separate rows when there isn't room.
     * @default 1
     */
    months?: number
    /**
     * Adds « and » beside the month arrows to jump a year at a time, handy for ranges that
     * span years. Only in the day view; the month and year grids already step by years.
     * @default false
     */
    showYearButtons?: boolean
    /** Shows each week's number (ISO 8601) at the start of its row. @default false */
    showWeekNumbers?: boolean
    /**
     * `false` skips the month change's slide. An object restyles it: give the `label` and `grid`
     * looks as values, or as functions of `where.direction` (`1` forward, `-1` back). @default true
     */
    motion?: CalendarMotion
    /** Class and style overrides for each part. */
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
    months: 1,
    showYearButtons: false,
    showWeekNumbers: false,
    motion: undefined,
    ui: undefined,
  },
)
const props = withProviderDefaults(rawProps, { motion: true, locale: undefined })

const emit = defineEmits<{
  /** Fires when you pick a date, month, year or range endpoint. */
  change: [value: Date | CalendarRange | null]
  /** Fires when the displayed month changes (nav buttons, keyboard, or clicking an adjacent month's day). */
  'month-change': [value: Date]
}>()

defineSlots<{
  /** Custom content for the month and year heading (defaults to its text). The heading keeps its
   * own click-to-pick-month/year, keyboard and aria wiring. With `months`, each month's label. */
  label(props: { label: string; date: Date; level: CalendarView }): unknown
  /** Custom content inside each day cell (defaults to the day number). The cell keeps its own
   * click, keyboard and aria wiring. */
  day(props: {
    date: Date
    isCurrentMonth: boolean
    isToday: boolean
    isSelected: boolean
    isDisabled: boolean
  }): unknown
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

interface WeekInfoLocale {
  getWeekInfo?: () => { firstDay: number }
  weekInfo?: { firstDay: number }
}

// Engines expose either getWeekInfo() (the standard; Chrome dropped the getter) or the
// older weekInfo getter, and some neither. Monday is the better blind guess: ISO 8601
// covers far more locales than Sunday-first, which is mainly the US and Canada.
function resolveFirstDayOfWeek(locale: string | undefined): number {
  try {
    const resolvedLocale = locale ?? Intl.DateTimeFormat().resolvedOptions().locale
    const intlLocale = new Intl.Locale(resolvedLocale) as unknown as WeekInfoLocale
    const info = intlLocale.getWeekInfo?.() ?? intlLocale.weekInfo
    if (info?.firstDay) return info.firstDay % 7
  } catch {}
  return 1
}

// Unset until mounted. A server can be on a different day than the visitor, and hydration
// doesn't fix a mismatched highlight or tab stop, so both renders leave it out.
const today = shallowRef<Date | null>(null)

function isRange(value: Date | CalendarRange | null): value is CalendarRange {
  return value != null && typeof value === 'object' && 'start' in value
}
function modelAnchor(): Date | null {
  if (!model.value) return null
  return isRange(model.value) ? (model.value.start ?? model.value.end ?? null) : model.value
}
// Without a value, the month's 1st stands in for today until mount.
const initialAnchor = modelAnchor() ?? startOfMonth(new Date())

const viewDate = ref<Date>(startOfMonth(initialAnchor))
// 1 = forward, -1 = backward; drives month-transition slide direction.
const direction = ref(1)
const motionOn = computed(() => !!props.motion)
// Yours set: the engine plays the label and grid swaps; otherwise their CSS classes do.
const swapMotion = useSwapMotion({
  key: 'calendar',
  motion: () => props.motion,
  direction: () => (direction.value < 0 ? -1 : 1),
  initial: {
    label: ({ direction: d }) => ({ opacity: 0, x: 4 * d, blur: 2 }),
    grid: ({ direction: d }) => ({ opacity: 0, x: 8 * d, blur: 3 }),
  },
  exit: {
    label: ({ direction: d }) => ({ opacity: 0, x: -4 * d, blur: 2 }),
    grid: ({ direction: d }) => ({ opacity: 0, x: -8 * d, blur: 3 }),
  },
  timing: { duration: 'var(--ui-duration-enter)', easing: 'var(--ui-ease-out)' },
})
const labelSwap = swapMotion.hooks('label', 'wait')
const gridSwap = swapMotion.hooks('grid', 'sync')
// Motion off: no `mode` either, since Vue throws on an out-in leave that ends at once (3.6 rc.12).
const swapped = (name: string, hooks: typeof labelSwap, mode?: 'out-in') =>
  swapMotion.active.value
    ? { css: false, onEnter: hooks.onEnter, onLeave: hooks.onLeave, mode }
    : {
        name: motionOn.value ? name : undefined,
        css: motionOn.value,
        mode: motionOn.value ? mode : undefined,
      }
const labelTransition = computed(() => swapped('ui-calendar-label', labelSwap, 'out-in'))
const gridTransition = computed(() => swapped('ui-calendar-grid', gridSwap))
const focusedDate = ref<Date>(initialAnchor)

onMounted(() => {
  const now = startOfDay(new Date())
  today.value = now
  if (modelAnchor()) return
  focusedDate.value = now
  if (!isSameMonth(viewDate.value, now)) viewDate.value = startOfMonth(now)
})
const navLevel = ref<CalendarView>(props.view)

// Moving between days, months and years zooms: out going up a level, in coming back down,
// around the cell that links the two levels (the month you're in, the year you picked).
const LEVEL_DEPTH: Record<CalendarView, number> = { date: 0, month: 1, year: 2 }
const zoom = ref<'in' | 'out'>('out')
let zoomLink = 'month'
function linkCellOrigin() {
  const body = bodyEl.value
  if (!body) return
  const cell = body
    .querySelector(
      zoomLink === 'year'
        ? `[data-year="${viewDate.value.getFullYear()}"]`
        : `[data-month="${viewDate.value.getMonth()}"]`,
    )
    ?.getBoundingClientRect()
  const box = body.getBoundingClientRect()
  body.style.setProperty(
    '--ui-calendar-origin',
    cell?.width
      ? `${cell.left + cell.width / 2 - box.left}px ${cell.top + cell.height / 2 - box.top}px`
      : 'center',
  )
}
// Sync, so zooming in reads the cell you picked before its grid is replaced.
watch(
  navLevel,
  (to, from) => {
    zoom.value = LEVEL_DEPTH[to] > LEVEL_DEPTH[from] ? 'out' : 'in'
    zoomLink = LEVEL_DEPTH[to] > LEVEL_DEPTH[from] ? to : from
    if (zoom.value === 'in') linkCellOrigin()
    if (to === 'year') focusedYear.value = viewDate.value.getFullYear()
  },
  { flush: 'sync' },
)
// Zooming out, the linking cell is in the grid that's arriving.
function anchorZoom() {
  if (zoom.value === 'out') linkCellOrigin()
}
const hoveredDate = ref<Date | null>(null)

const resolvedFirstDay = computed(() => props.firstDayOfWeek ?? resolveFirstDayOfWeek(props.locale))

// The months on show: `viewDate`'s and the ones after it.
const panes = computed<Date[]>(() =>
  Array.from({ length: Math.max(1, Math.floor(props.months)) }, (_, i) =>
    addMonths(viewDate.value, i),
  ),
)
// Each month labels itself; the header keeps only the arrows.
const splitMonths = computed(() => panes.value.length > 1 && navLevel.value === 'date')
function isShownMonth(day: Date): boolean {
  return panes.value.some((pane) => isSameMonth(day, pane))
}
// Brings `day`'s month on screen, as the first month going back or the last going forward.
function showMonth(day: Date) {
  const forward = day > viewDate.value
  setView(forward ? addMonths(startOfMonth(day), 1 - panes.value.length) : day, forward ? 1 : -1)
}
function weeksOf(month: Date): Date[][] {
  const end = endOfWeek(endOfMonth(month), resolvedFirstDay.value)
  const out: Date[][] = []
  let cursor = startOfWeek(startOfMonth(month), resolvedFirstDay.value)
  while (cursor <= end) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(cursor)
      cursor = addDays(cursor, 1)
    }
    out.push(week)
  }
  return out
}
function monthKeyOf(month: Date): string {
  return `${month.getFullYear()}-${month.getMonth()}`
}

// Month/year grid data
const monthsInYear = computed<Date[]>(() =>
  Array.from({ length: 12 }, (_, i) => new Date(viewDate.value.getFullYear(), i, 1)),
)
const monthRows = computed<Date[][]>(() => {
  const out: Date[][] = []
  for (let i = 0; i < 12; i += 4) out.push(monthsInYear.value.slice(i, i + 4))
  return out
})
// 12-year window with viewDate's year always in the 2nd row. Rows are aligned
// to multiples of 4, so paging by 12 lands on the same row boundaries.
const yearWindowStart = computed(() => {
  const year = viewDate.value.getFullYear()
  return year - (year % 4) - 4
})
const yearsInWindow = computed<number[]>(() =>
  Array.from({ length: 12 }, (_, i) => yearWindowStart.value + i),
)
const yearRows = computed<number[][]>(() => {
  const out: number[][] = []
  for (let i = 0; i < 12; i += 4) out.push(yearsInWindow.value.slice(i, i + 4))
  return out
})

const canDrill = computed(() => navLevel.value !== 'year')
// The year grid's tab stop: the focused year while it's on show, else viewDate's.
const focusedYear = ref(viewDate.value.getFullYear())
const yearStop = computed(() =>
  yearsInWindow.value.includes(focusedYear.value)
    ? focusedYear.value
    : viewDate.value.getFullYear(),
)

function monthYearFormat(month: Date): string {
  return new Intl.DateTimeFormat(props.locale, { month: 'long', year: 'numeric' }).format(month)
}
const monthYearLabel = computed(() => monthYearFormat(viewDate.value))
const yearLabel = computed(() => String(viewDate.value.getFullYear()))
const yearRangeLabel = computed(
  () => `${yearsInWindow.value[0]} – ${yearsInWindow.value[yearsInWindow.value.length - 1]}`,
)
const headerLabel = computed(() => {
  if (navLevel.value === 'date') return monthYearLabel.value
  if (navLevel.value === 'month') return yearLabel.value
  return yearRangeLabel.value
})
const messages = useUiMessages()
const previousLabel = computed(() =>
  navLevel.value === 'date'
    ? messages.value.calendar.previousMonth
    : navLevel.value === 'month'
      ? messages.value.calendar.previousYear
      : messages.value.calendar.previousYears,
)
const nextLabel = computed(() =>
  navLevel.value === 'date'
    ? messages.value.calendar.nextMonth
    : navLevel.value === 'month'
      ? messages.value.calendar.nextYear
      : messages.value.calendar.nextYears,
)

const weekdayLabels = computed(() => {
  const formatter = new Intl.DateTimeFormat(props.locale, { weekday: 'short' })
  return (weeksOf(viewDate.value)[0] ?? []).map((day) => formatter.format(day))
})
function cellLabel(day: Date): string {
  return new Intl.DateTimeFormat(props.locale, { dateStyle: 'full' }).format(day)
}
// The ISO week of the row's Thursday, which shares its week with most of the row whatever day
// the week starts on.
function isoWeek(week: Date[]): number {
  const thursday = week.find((day) => day.getDay() === 4)!
  const dayOfYear = Math.round(
    (startOfDay(thursday).getTime() - new Date(thursday.getFullYear(), 0, 1).getTime()) / 864e5,
  )
  return Math.floor(dayOfYear / 7) + 1
}
function weekLabel(week: Date[]): string {
  return messages.value.calendar.weekNumber.replace('{week}', String(isoWeek(week)))
}
function monthLabel(month: Date): string {
  return new Intl.DateTimeFormat(props.locale, { month: 'short' }).format(month)
}

function isToday(day: Date): boolean {
  return today.value !== null && isSameDay(day, today.value)
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
// The committed days between a range's ends; a hover preview isn't a selection.
function isBetweenEnds(day: Date): boolean {
  const value = model.value
  if (!isRange(value) || !value.start || !value.end) return false
  const [from, to] = value.start <= value.end ? [value.start, value.end] : [value.end, value.start]
  return day > startOfDay(from) && day < startOfDay(to)
}
function isDayInRange(day: Date): boolean {
  const bounds = rangeBounds()
  if (!bounds) return false
  return day > startOfDay(bounds.start) && day < startOfDay(bounds.end)
}
// The side an endpoint meets the band on, committed or previewed, so only those corners flatten.
function joinSide(day: Date): 'start' | 'end' | null {
  const bounds = rangeBounds()
  if (!bounds || isSameDay(bounds.start, bounds.end)) return null
  if (!isRangeStart(day) && !isRangeEnd(day)) return null
  if (isSameDay(day, bounds.start)) return 'end'
  if (isSameDay(day, bounds.end)) return 'start'
  return null
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

// Paging is blocked only when the whole target page lies past min/max; aria-disabled (not
// `disabled`) keeps focus on the button when it reaches the edge.
const canGoPrevious = computed(() => {
  const min = props.minDate
  if (!min) return true
  if (navLevel.value === 'date') return endOfMonth(addMonths(viewDate.value, -1)) >= startOfDay(min)
  const lastYear =
    navLevel.value === 'month' ? viewDate.value.getFullYear() - 1 : yearWindowStart.value - 1
  return lastYear >= min.getFullYear()
})
const canGoNext = computed(() => {
  const max = props.maxDate
  if (!max) return true
  if (navLevel.value === 'date')
    return addMonths(startOfMonth(viewDate.value), panes.value.length) <= startOfDay(max)
  const firstYear =
    navLevel.value === 'month' ? viewDate.value.getFullYear() + 1 : yearWindowStart.value + 12
  return firstYear <= max.getFullYear()
})

// Month/year grids stretch to the day view's last size, so drilling up or down doesn't jump.
const dateBodySize = ref<{ inline: number; block: number } | null>(null)
const bodyMinSize = computed(() => {
  const size = dateBodySize.value
  if (navLevel.value === 'date' || !size) return undefined
  return { minInlineSize: `${size.inline}px`, minBlockSize: `${size.block}px` }
})

// Navigation
function setView(date: Date, dir: 1 | -1) {
  animateBodyHeight(() => {
    direction.value = dir
    viewDate.value = navLevel.value === 'date' ? startOfMonth(date) : date
    if (navLevel.value === 'date') emit('month-change', startOfMonth(date))
  })
}
function goPrevious() {
  if (!canGoPrevious.value) return
  if (navLevel.value === 'date') setView(addMonths(viewDate.value, -1), -1)
  else if (navLevel.value === 'month') setView(addYears(viewDate.value, -1), -1)
  else setView(addYears(viewDate.value, -12), -1)
}
// A year back or forward, stopping at minDate/maxDate's month rather than refusing the jump.
const yearButtons = computed(() => props.showYearButtons && navLevel.value === 'date')
function goPreviousYear() {
  if (!canGoPrevious.value) return
  const min = props.minDate && startOfMonth(props.minDate)
  const target = addMonths(viewDate.value, -12)
  setView(min && target < min ? min : target, -1)
}
function goNextYear() {
  if (!canGoNext.value) return
  const lastPane = props.maxDate && addMonths(startOfMonth(props.maxDate), 1 - panes.value.length)
  const target = addMonths(viewDate.value, 12)
  setView(lastPane && target > lastPane ? lastPane : target, 1)
}
function goNext() {
  if (!canGoNext.value) return
  if (navLevel.value === 'date') setView(addMonths(viewDate.value, 1), 1)
  else if (navLevel.value === 'month') setView(addYears(viewDate.value, 1), 1)
  else setView(addYears(viewDate.value, 12), 1)
}
// Header-label click: temporarily drill up to coarser level for fast nav
// A month name cut short with an ellipsis shows in full on hover; one that fits gets no tooltip.
function titleIfCut(event: PointerEvent) {
  const button = event.currentTarget as HTMLElement
  const text = button.querySelector<HTMLElement>('.ui-calendar-label-text') ?? button
  if (text.scrollWidth > text.clientWidth) button.title = button.textContent!.trim()
  else button.removeAttribute('title')
}
// Which of the shown months the month grid was opened from, so the month picked there lands
// back in that spot: open it from the second month, and your pick shows second.
let drillPane = 0
function drillUp(month?: Date, pane = 0) {
  drillPane = pane
  animateBodyHeight(() => {
    if (month) viewDate.value = month
    if (navLevel.value === 'date') navLevel.value = 'month'
    else if (navLevel.value === 'month') navLevel.value = 'year'
  })
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
  // A disabled day does nothing, including the jump to its month when it's an adjacent month's day.
  if (isDayDisabled(day)) return
  focusedDate.value = day
  if (!isShownMonth(day)) showMonth(day)
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
  // The same day of the picked month takes the tab stop, and focus if the calendar had it.
  const day = Math.min(focusedDate.value.getDate(), endOfMonth(month).getDate())
  focusedDate.value = new Date(month.getFullYear(), month.getMonth(), day)
  const moveFocus = hasFocus()
  animateBodyHeight(() => {
    // The zoom back in centres on the picked month's cell, read when navLevel changes.
    viewDate.value = startOfMonth(month)
    navLevel.value = 'date'
    viewDate.value = addMonths(startOfMonth(month), -drillPane)
    drillPane = 0
  })
  if (moveFocus) focusLevelCell(`[data-date="${isoDate(focusedDate.value)}"]`)
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
  animateBodyHeight(() => {
    viewDate.value = new Date(year, viewDate.value.getMonth(), 1)
    navLevel.value = 'month'
  })
  if (hasFocus()) focusLevelCell(`[data-month="${viewDate.value.getMonth()}"]`)
}

const rootEl = useTemplateRef<HTMLElement>('rootEl')
// The first month's grid, the one `gridEl` exposes.
const gridEl = shallowRef<HTMLElement | null>(null)
function setGridEl(el: Element | ComponentPublicInstance | null) {
  gridEl.value = el instanceof HTMLElement ? el : null
}
const bodyEl = useTemplateRef<HTMLElement>('bodyEl')
// The hover and keyboard highlight glides between days (and months, and years) on both axes.
const hoverEl = useTemplateRef<HTMLElement>('hoverEl')
const { style: hoverStyle } = useHoverIndicator(bodyEl, {
  itemSelector:
    '.ui-calendar-cell:not(.ui-calendar-cell--blank), .ui-calendar-month-cell, .ui-calendar-year-cell',
  scope: '.ui-calendar-body',
  motion: () => motionOn.value,
  indicatorEl: hoverEl,
})
const labelButton = useTemplateRef<HTMLElement>('labelButton')

// The label button is as wide as its text, so a new name would snap it to a new width and the
// centred text would jump sideways. The incoming name is measured ahead with a hidden copy, and
// the width eases over the whole swap (the old name out, the new one in) as one movement.
watch(
  headerLabel,
  (next) => {
    const button = labelButton.value
    const text = button?.querySelector<HTMLElement>('.ui-calendar-label-text')
    if (!button || !text || !motionOn.value) return
    if (prefersReducedMotion()) return
    // A custom #label renders more than text; only the plain name is measured.
    if (text.childElementCount > 0) return
    button.style.inlineSize = ''
    const before = button.offsetWidth
    const probe = text.cloneNode(false) as HTMLElement
    probe.textContent = next
    probe.className = text.className.split(' ')[0] ?? ''
    probe.style.position = 'absolute'
    probe.style.visibility = 'hidden'
    probe.style.whiteSpace = 'nowrap'
    button.append(probe)
    const after = before - text.offsetWidth + probe.offsetWidth
    probe.remove()
    if (!after || Math.abs(after - before) < 1) return
    button.style.transition = 'none'
    button.style.inlineSize = `${before}px`
    button.style.textOverflow = 'clip'
    void button.offsetWidth
    button.style.transition =
      'inline-size calc(var(--ui-duration-tooltip-exit) + var(--ui-duration-enter)) var(--ui-ease-out)'
    button.style.inlineSize = `${after}px`
    button.addEventListener(
      'transitionend',
      () => {
        button.style.transition = ''
        button.style.inlineSize = ''
        button.style.textOverflow = ''
      },
      { once: true },
    )
  },
  { flush: 'pre' },
)

// FLIP-style height animation: Vue's Transition already handles the grid's
// own slide/fade, but the body's overall height (a 4-week vs. 6-week month,
// or switching to the month/year grid entirely) has no "from" and "to" auto
// value CSS can transition between — measure both sides and animate the gap.
function animateBodyHeight(mutate: () => void) {
  if (navLevel.value === 'date' && bodyEl.value) {
    dateBodySize.value = { inline: bodyEl.value.offsetWidth, block: bodyEl.value.offsetHeight }
  }
  if (!motionOn.value || !bodyEl.value) {
    mutate()
    return
  }
  const body = bodyEl.value
  const before = body.offsetHeight
  mutate()
  nextTick(() => {
    const after = body.offsetHeight
    if (!after || before === after) return
    body.style.overflowY = 'clip'
    body.style.blockSize = `${before}px`
    void body.offsetHeight
    requestAnimationFrame(() => {
      body.style.transition = `block-size var(--ui-duration-enter) var(--ui-ease-in-out)`
      body.style.blockSize = `${after}px`
    })
    body.addEventListener(
      'transitionend',
      () => {
        body.style.overflowY = ''
        body.style.blockSize = ''
        body.style.transition = ''
      },
      { once: true },
    )
  })
}

function focusCellEl(day: Date) {
  bodyEl.value?.querySelector<HTMLElement>(`[data-date="${isoDate(day)}"]`)?.focus()
}
function moveFocus(day: Date) {
  focusedDate.value = day
  if (!isShownMonth(day)) showMonth(day)
  nextTick(() => focusCellEl(day))
}
/** Roving-tabindex to a specific day, or its month or year in those views. */
function focusDay(day: Date) {
  navLevel.value = props.view
  if (props.view === 'date') return moveFocus(day)
  viewDate.value = startOfMonth(day)
  focusedYear.value = day.getFullYear()
  focusLevelCell(
    props.view === 'month'
      ? `[data-month="${day.getMonth()}"]`
      : `[data-year="${day.getFullYear()}"]`,
  )
}
function hasFocus(): boolean {
  return !!rootEl.value?.contains(document.activeElement)
}
// A grid swap leaves the old grid in place before the new one, so the last match that takes
// focus is the arriving cell.
function focusLevelCell(selector: string) {
  nextTick(() => {
    const cells = [...(bodyEl.value?.querySelectorAll<HTMLElement>(selector) ?? [])]
    for (const cell of cells.reverse()) {
      cell.focus()
      if (document.activeElement === cell) return
    }
  })
}

// Month and year grids are four wide: arrows step a cell or a row, Home and End go to the row's
// ends, Page keys a page (a year of months, twelve years).
const GRID_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -4,
  ArrowDown: 4,
}
function gridStep(event: KeyboardEvent, index: number, page: number): number | null {
  const key = inlineKey(event.key, event.currentTarget as Element)
  if (key in GRID_STEPS) return GRID_STEPS[key]!
  if (key === 'Home') return -(index % 4)
  if (key === 'End') return 3 - (index % 4)
  if (key === 'PageUp') return -page
  if (key === 'PageDown') return page
  return null
}
function onMonthKeydown(event: KeyboardEvent) {
  const step = gridStep(event, viewDate.value.getMonth(), 12)
  if (step === null) return
  event.preventDefault()
  const next = addMonths(viewDate.value, step)
  if (next.getFullYear() === viewDate.value.getFullYear()) viewDate.value = next
  else setView(next, step < 0 ? -1 : 1)
  focusLevelCell(`[data-month="${next.getMonth()}"]`)
}
function onYearKeydown(event: KeyboardEvent) {
  const step = gridStep(event, yearStop.value - yearWindowStart.value, 12)
  if (step === null) return
  event.preventDefault()
  const year = yearStop.value + step
  focusedYear.value = year
  const offset = year - yearWindowStart.value
  if (offset < 0 || offset >= 12) {
    setView(addYears(viewDate.value, offset < 0 ? -12 : 12), offset < 0 ? -1 : 1)
  }
  focusLevelCell(`[data-year="${year}"]`)
}

function onGridKeydown(event: KeyboardEvent) {
  let next: Date | null = null
  // ARIA APG keyboard nav: arrow keys move focus, Enter/Space select. Right to left, the week
  // runs from the right.
  switch (inlineKey(event.key, event.currentTarget as Element)) {
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
  if (navLevel.value === 'date' && !isShownMonth(anchor)) viewDate.value = startOfMonth(anchor)
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
// With several months, a neighbouring month's days are blank: each date shows once.
function isBlank(day: Date, month: Date): boolean {
  return panes.value.length > 1 && !isSameMonth(day, month)
}
const slots = useSlots()
function dayAttrs(day: Date, month: Date) {
  if (isBlank(day, month)) return { 'aria-hidden': 'true' as const }
  return {
    'data-date': isoDate(day),
    tabindex: isSameDay(day, focusedDate.value) ? 0 : -1,
    'aria-selected': isDaySelected(day) || isBetweenEnds(day) || undefined,
    'aria-current': isToday(day) ? ('date' as const) : undefined,
    'aria-disabled': isDayDisabled(day) || undefined,
    'aria-label': slots.day ? undefined : cellLabel(day),
  }
}
function cellPart(day: Date, month: Date) {
  return resolveUiPart(
    cx,
    themedUi()?.cell,
    'ui-calendar-cell',
    isBlank(day, month) && 'ui-calendar-cell--blank',
    !isSameMonth(day, month) && 'ui-calendar-cell--outside',
    isToday(day) && 'ui-calendar-cell--today',
    isDaySelected(day) && 'ui-calendar-cell--selected',
    isDayDisabled(day) && 'ui-calendar-cell--disabled',
    props.selectionMode === 'range' && isRangeStart(day) && 'ui-calendar-cell--range-start',
    props.selectionMode === 'range' && isRangeEnd(day) && 'ui-calendar-cell--range-end',
    props.selectionMode === 'range' && isDayInRange(day) && 'ui-calendar-cell--in-range',
    props.selectionMode === 'range' && joinSide(day) === 'end' && 'ui-calendar-cell--join-end',
    props.selectionMode === 'range' && joinSide(day) === 'start' && 'ui-calendar-cell--join-start',
  )
}

defineExpose({
  /** Root element. */
  rootEl,
  /** Day grid element (`null` while the month or year grid shows). */
  gridEl,
  /** The hover and keyboard highlight, sliding between cells. With `motion: false` it moves at once, for your own animation. */
  highlightEl: hoverEl,
  /** Steps back one page: a month, or a year or 12 years in the month and year grids. */
  goToPreviousMonth: goPrevious,
  /** Steps forward one page: a month, or a year or 12 years in the month and year grids. */
  goToNextMonth: goNext,
  /** Moves keyboard focus to the given day, switching months if needed. With `view` set to `'month'` or `'year'`, focuses its month or year. */
  focusDay,
})
</script>
