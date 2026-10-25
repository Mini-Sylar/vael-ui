import { computed, inject, shallowRef, toValue } from 'vue'
import type { InjectionKey, MaybeRefOrGetter, Ref } from 'vue'

export interface UiMessages {
  button: {
    /** Read out on a Button with `hold`, which only acts after a press and hold. */
    hold: string
  }
  dialog: {
    close: string
    maximize: string
    restore: string
  }
  toast: {
    dismiss: string
  }
  message: {
    dismiss: string
  }
  pullToRefresh: {
    pull: string
    release: string
    refreshing: string
    updated: string
  }
  input: {
    /** The `clearable` button's name. */
    clear: string
  }
  inputNumber: {
    increment: string
    decrement: string
  }
  passwordInput: {
    show: string
    hide: string
    /** Read after a requirement that the password meets. */
    met: string
    /** Read after a requirement that the password doesn't meet yet. */
    unmet: string
  }
  select: {
    empty: string
    clear: string
    /** `{count}` is replaced with the number of selected items — the
     * `display="count"` trigger summary in `multiple` mode. */
    selectedCount: string
  }
  combobox: {
    empty: string
    clear: string
    toggle: string
    /** `{query}` is replaced with the typed text — the `allowCustom` create row. */
    create: string
  }
  fileUpload: {
    browse: string
    drop: string
    remove: string
    /** Announced for a file that `accept`, `maxSize` or `maxFiles` turned away; `{name}` is its name. */
    rejectedAccept: string
    rejectedMaxSize: string
    rejectedMaxFiles: string
  }
  cascadeSelect: {
    empty: string
    clear: string
    /** `{count}` is replaced with the number of selected leaves, for `display="count"`. */
    selectedCount: string
  }
  treeSelect: {
    clear: string
    /** `{count}` is replaced with the number of selected nodes, for `display="count"`. */
    selectedCount: string
  }
  speedDial: {
    /** The actions menu's name, when no `ariaLabel` prop is given. */
    label: string
  }
  toolbar: {
    /** The overflow button's name, when no `overflowLabel` prop is given. */
    more: string
  }
  stepper: {
    /** Read after a step that's done. */
    completed: string
  }
  bottomSheet: {
    /** The drag handle's name; it also moves between snap points with the arrow keys. */
    resize: string
  }
  resizable: {
    /** The handle's name, when no `ariaLabel` prop is given. */
    label: string
  }
  chip: {
    remove: string
  }
  splitButton: {
    /** aria-label for the wordless chevron trigger, when no `triggerLabel` prop is given. */
    more: string
  }
  breadcrumb: {
    /** aria-label for the `<nav>` landmark. */
    label: string
  }
  commandPalette: {
    placeholder: string
    empty: string
    /** Accessible name of the palette's dialog. */
    label: string
    /** Announced as you type; `{count}` is the number of results. */
    results: string
  }
  colorPicker: {
    /** aria-label of the saturation and brightness plane. */
    saturationAndBrightness: string
    saturation: string
    brightness: string
    hue: string
    /** aria-label of the hex field. */
    hex: string
    /** aria-label of the eyedropper button. */
    pickFromScreen: string
  }
  tour: {
    next: string
    back: string
    skip: string
    done: string
    /** `{current}` and `{total}` are replaced with the step position — e.g. "Step {current} of {total}". */
    stepOf: string
  }
  toaster: {
    /** aria-label for the toast region landmark. */
    label: string
  }
  pagination: {
    /** aria-label for the `<nav>` landmark. */
    label: string
    first: string
    previous: string
    /** `{page}` is replaced with the page number. */
    page: string
    next: string
    last: string
    /** aria-label for the page-size select. */
    pageSize: string
  }
  datePicker: {
    /** aria-label for the trigger button that opens the calendar. */
    chooseDate: string
    /** `showButtonBar`'s built-in footer button — `selectionMode="single"` only. */
    today: string
    /** `showButtonBar`'s built-in footer button. */
    clear: string
    /** aria-label for `showTime`'s hour field. */
    hour: string
    /** aria-label for `showTime`'s minute field. */
    minute: string
    increaseHour: string
    decreaseHour: string
    increaseMinute: string
    decreaseMinute: string
  }
  dataTable: {
    selectAll: string
    selectRow: string
    collapseRow: string
    expandRow: string
    /** Read out while `loading` is on. */
    loading: string
    /** Read after a keyboard column resize; `{label}` is the column, `{width}` its width in pixels. */
    columnWidth: string
  }
  /** Drag-to-reorder. These carry `{label}`, `{position}`, `{total}` and `{depth}` placeholders rather than being functions, so a consumer's own `t()` can return them as plain strings like every other entry here. */
  sortable: {
    /** Announced on grab, and used as the handle's accessible description. */
    instructions: string
    grabbed: string
    moved: string
    /** Used instead of `moved` only where depth is meaningful (a tree). */
    movedToLevel: string
    dropped: string
    cancelled: string
  }
  /** `{value}` and `{max}` are replaced with the current and maximum rating. */
  rating: {
    valueText: string
  }
  /** Range slider thumb names, read after the slider's own label ("Price Minimum"). */
  slider: {
    minimum: string
    maximum: string
  }
  /** Calendar header arrows. In the month grid they step a year, in the year grid 12 years. */
  calendar: {
    /** Names a week's row header with `showWeekNumbers`; `{week}` is its ISO week number. */
    weekNumber: string
    previousMonth: string
    nextMonth: string
    previousYear: string
    nextYear: string
    previousYears: string
    nextYears: string
  }
}

export type PartialUiMessages = {
  [K in keyof UiMessages]?: Partial<UiMessages[K]>
}

// One constant per section, so a component ships only the strings it shows.
export const buttonMessages: UiMessages['button'] = { hold: 'Press and hold to confirm' }
export const dialogMessages: UiMessages['dialog'] = {
  close: 'Close',
  maximize: 'Maximize',
  restore: 'Restore',
}
export const toastMessages: UiMessages['toast'] = { dismiss: 'Dismiss' }
export const messageMessages: UiMessages['message'] = { dismiss: 'Dismiss' }
export const pullToRefreshMessages: UiMessages['pullToRefresh'] = {
  pull: 'Pull to refresh',
  release: 'Release to refresh',
  refreshing: 'Refreshing…',
  updated: 'Updated',
}
export const inputMessages: UiMessages['input'] = { clear: 'Clear' }
export const inputNumberMessages: UiMessages['inputNumber'] = {
  increment: 'Increase',
  decrement: 'Decrease',
}
export const passwordInputMessages: UiMessages['passwordInput'] = {
  show: 'Show password',
  hide: 'Hide password',
  met: 'met',
  unmet: 'not met',
}
export const selectMessages: UiMessages['select'] = {
  empty: 'No options',
  clear: 'Clear selection',
  selectedCount: '{count} selected',
}
export const comboboxMessages: UiMessages['combobox'] = {
  empty: 'No results',
  clear: 'Clear selection',
  toggle: 'Toggle options',
  create: 'Create "{query}"',
}
export const fileUploadMessages: UiMessages['fileUpload'] = {
  browse: 'Browse files',
  drop: 'Drop files here',
  remove: 'Remove',
  rejectedAccept: '{name} wasn’t added: that type of file isn’t accepted.',
  rejectedMaxSize: '{name} wasn’t added: it’s too large.',
  rejectedMaxFiles: '{name} wasn’t added: there are already as many files as allowed.',
}
export const cascadeSelectMessages: UiMessages['cascadeSelect'] = {
  empty: 'No options',
  clear: 'Clear selection',
  selectedCount: '{count} selected',
}
export const treeSelectMessages: UiMessages['treeSelect'] = {
  clear: 'Clear selection',
  selectedCount: '{count} selected',
}
export const speedDialMessages: UiMessages['speedDial'] = { label: 'Actions' }
export const toolbarMessages: UiMessages['toolbar'] = { more: 'More' }
export const stepperMessages: UiMessages['stepper'] = { completed: 'Completed' }
export const bottomSheetMessages: UiMessages['bottomSheet'] = { resize: 'Resize sheet' }
export const resizableMessages: UiMessages['resizable'] = { label: 'Resize' }
export const chipMessages: UiMessages['chip'] = { remove: 'Remove' }
export const splitButtonMessages: UiMessages['splitButton'] = { more: 'More actions' }
export const breadcrumbMessages: UiMessages['breadcrumb'] = { label: 'Breadcrumb' }
export const commandPaletteMessages: UiMessages['commandPalette'] = {
  placeholder: 'Search…',
  empty: 'No results',
  label: 'Command palette',
  results: '{count} results',
}
export const colorPickerMessages: UiMessages['colorPicker'] = {
  saturationAndBrightness: 'Saturation and brightness',
  saturation: 'saturation',
  brightness: 'brightness',
  hue: 'Hue',
  hex: 'Hex color',
  pickFromScreen: 'Pick a color from the screen',
}
export const tourMessages: UiMessages['tour'] = {
  next: 'Next',
  back: 'Back',
  skip: 'Skip',
  done: 'Done',
  stepOf: 'Step {current} of {total}',
}
export const toasterMessages: UiMessages['toaster'] = { label: 'Notifications' }
export const paginationMessages: UiMessages['pagination'] = {
  label: 'Pagination',
  first: 'First page',
  previous: 'Previous page',
  page: 'Page {page}',
  next: 'Next page',
  last: 'Last page',
  pageSize: 'Rows per page',
}
export const datePickerMessages: UiMessages['datePicker'] = {
  chooseDate: 'Choose date',
  today: 'Today',
  clear: 'Clear',
  hour: 'Hour',
  minute: 'Minute',
  increaseHour: 'Increase hour',
  decreaseHour: 'Decrease hour',
  increaseMinute: 'Increase minute',
  decreaseMinute: 'Decrease minute',
}
export const dataTableMessages: UiMessages['dataTable'] = {
  selectAll: 'Select all rows',
  selectRow: 'Select row',
  collapseRow: 'Collapse row',
  expandRow: 'Expand row',
  loading: 'Loading…',
  columnWidth: '{label}: {width} pixels',
}
export const sortableMessages: UiMessages['sortable'] = {
  instructions:
    'Press Space or Enter to start reordering. Use the arrow keys to move, Space to drop, Escape to cancel.',
  grabbed: 'Grabbed {label}. Position {position} of {total}.',
  moved: '{label} moved to position {position} of {total}.',
  movedToLevel: '{label} moved to position {position} of {total}, level {depth}.',
  dropped: 'Dropped {label} at position {position} of {total}.',
  cancelled: 'Reordering cancelled. {label} returned to its original position.',
}
export const ratingMessages: UiMessages['rating'] = { valueText: '{value} of {max}' }
export const sliderMessages: UiMessages['slider'] = { minimum: 'Minimum', maximum: 'Maximum' }
export const calendarMessages: UiMessages['calendar'] = {
  weekNumber: 'Week {week}',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  previousYears: 'Previous years',
  nextYears: 'Next years',
}

export const defaultMessages: UiMessages = {
  button: buttonMessages,
  dialog: dialogMessages,
  toast: toastMessages,
  message: messageMessages,
  pullToRefresh: pullToRefreshMessages,
  input: inputMessages,
  inputNumber: inputNumberMessages,
  passwordInput: passwordInputMessages,
  select: selectMessages,
  combobox: comboboxMessages,
  fileUpload: fileUploadMessages,
  cascadeSelect: cascadeSelectMessages,
  treeSelect: treeSelectMessages,
  speedDial: speedDialMessages,
  toolbar: toolbarMessages,
  stepper: stepperMessages,
  bottomSheet: bottomSheetMessages,
  resizable: resizableMessages,
  chip: chipMessages,
  splitButton: splitButtonMessages,
  breadcrumb: breadcrumbMessages,
  commandPalette: commandPaletteMessages,
  colorPicker: colorPickerMessages,
  tour: tourMessages,
  toaster: toasterMessages,
  pagination: paginationMessages,
  datePicker: datePickerMessages,
  dataTable: dataTableMessages,
  sortable: sortableMessages,
  rating: ratingMessages,
  slider: sliderMessages,
  calendar: calendarMessages,
}

/** What a `ConfigProvider` hands down: its own strings, and an i18n to look the rest up in. */
export interface UiMessageSource {
  messages?: PartialUiMessages
  i18n?: I18nInstance
}

export const messagesKey: InjectionKey<Ref<UiMessageSource>> = Symbol('ui-messages')

// Yours, then your i18n's `uiKit.<section>.<key>`, then the English default.
function sectionOf<K extends keyof UiMessages>(
  source: UiMessageSource | undefined,
  section: K,
  defaults: UiMessages[K],
): UiMessages[K] {
  const own = source?.messages?.[section] as Record<string, string | undefined> | undefined
  const i18n = source?.i18n
  if (!own && !i18n) return defaults
  const out = { ...defaults } as Record<string, string>
  for (const key of Object.keys(defaults)) {
    const mine = own?.[key]
    if (mine !== undefined) out[key] = mine
    else if (i18n) {
      const path = `uiKit.${section}.${key}`
      const text = (i18n.t as (key: string, named: object, options: object) => string)(
        path,
        {},
        quiet,
      )
      if (text !== path) out[key] = text
    }
  }
  return out as UiMessages[K]
}

/**
 * The sections a component shows, from the nearest `ConfigProvider` over these defaults. Each
 * component passes only its own (`{ dialog: dialogMessages }`), so it ships only those strings.
 */
export function useMessages<S extends Partial<UiMessages>>(defaults: S): Readonly<Ref<S>> {
  const source = inject(messagesKey, undefined)
  if (!source) return shallowRef(defaults)
  return computed(() => {
    const out = {} as Record<string, unknown>
    for (const section of Object.keys(defaults) as (keyof UiMessages)[])
      out[section] = sectionOf(source.value, section, defaults[section]!)
    return out as S
  })
}

/** The whole catalog from the nearest `ConfigProvider`, with English defaults where it has none. */
export function useUiMessages(): Readonly<Ref<UiMessages>> {
  return useMessages(defaultMessages)
}

export function mergeMessages(base: UiMessages, overrides?: PartialUiMessages): UiMessages {
  if (!overrides) return base
  // Section by section, yours over ours: a section you leave out keeps every default.
  const out = {} as Record<string, object>
  for (const section of Object.keys(base) as (keyof UiMessages)[])
    out[section] = { ...base[section], ...overrides[section] }
  return out as unknown as UiMessages
}

/**
 * Structural contract, not a dependency: anything shaped like this — most
 * notably vue-i18n's `Composer` (the return value of `useI18n()`) — works,
 * without the library ever importing `vue-i18n` itself. No package.json
 * change needed on either side.
 */
export interface I18nInstance {
  t: (key: string) => string
  /** The current locale (vue-i18n's ref, a getter or a string); formats dates and numbers. */
  locale?: MaybeRefOrGetter<string>
}

/**
 * Where each of our strings lives in the CONSUMER's own i18n catalog: `uiKit.<section>.<key>`,
 * for every key in `defaultMessages`. An app that wants translated vael-ui strings adds these paths
 * to its existing locale files — one catalog, not two. A key that isn't there falls back to our
 * English default instead of leaking the raw path.
 */

// vue-i18n reads these options and skips its missing-key warning, since a missing key just means
// our English default. Libraries whose `t` takes only a key ignore them.
const quiet = { missingWarn: false, fallbackWarn: false }
const warnedLocales = new Set<string>()

/**
 * Calls `t()` for each of our known keys. A missing translation is
 * detected the way most i18n libraries (vue-i18n included) signal it: `t()`
 * returns the key string itself unchanged — that case is omitted from the
 * result entirely (not set to `undefined`) so `mergeMessages` falls through
 * to the English default instead of clobbering it with an empty value.
 *
 * An app with no uiKit keys isn't translating vael-ui, so it hears nothing. One that has some but
 * not all gets a single dev-only warning per locale listing the ones it missed.
 */
export function resolveMessagesFromI18n(i18n: I18nInstance): PartialUiMessages {
  const result: Record<string, Record<string, string>> = {}
  const missing: string[] = []
  let found = 0
  for (const [section, keys] of Object.entries(defaultMessages))
    for (const key of Object.keys(keys)) {
      const path = `uiKit.${section}.${key}`
      const text = (i18n.t as (key: string, named: object, options: object) => string)(
        path,
        {},
        quiet,
      )
      if (text === path) {
        missing.push(path)
        continue
      }
      found++
      ;(result[section] ??= {})[key] = text
    }

  if (process.env.NODE_ENV !== 'production' && found > 0 && missing.length > 0) {
    const locale = toValue(i18n.locale) ?? ''
    if (!warnedLocales.has(locale)) {
      warnedLocales.add(locale)
      // eslint-disable-next-line no-console -- the one dev-only warning, asked for above
      console.warn(
        `vael-ui: ${missing.length} uiKit keys aren't translated${locale ? ` for "${locale}"` : ''}, so they show the English default: ${missing.join(', ')}`,
      )
    }
  }

  return result as PartialUiMessages
}
