import { inject, shallowRef, toValue } from 'vue'
import type { InjectionKey, MaybeRefOrGetter, Ref } from 'vue'

export interface UiMessages {
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
  inputNumber: {
    increment: string
    decrement: string
  }
  passwordInput: {
    show: string
    hide: string
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
  }
  cascadeSelect: {
    empty: string
    clear: string
    /** `{count}` is replaced with the number of selected leaves, for `display="count"`. */
    selectedCount: string
  }
  treeSelect: {
    clear: string
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

export const defaultMessages: UiMessages = {
  dialog: { close: 'Close', maximize: 'Maximize', restore: 'Restore' },
  toast: { dismiss: 'Dismiss' },
  message: { dismiss: 'Dismiss' },
  pullToRefresh: {
    pull: 'Pull to refresh',
    release: 'Release to refresh',
    refreshing: 'Refreshing…',
    updated: 'Updated',
  },
  inputNumber: { increment: 'Increase', decrement: 'Decrease' },
  passwordInput: { show: 'Show password', hide: 'Hide password' },
  select: { empty: 'No options', clear: 'Clear selection', selectedCount: '{count} selected' },
  combobox: {
    empty: 'No results',
    clear: 'Clear selection',
    toggle: 'Toggle options',
    create: 'Create "{query}"',
  },
  fileUpload: { browse: 'Browse files', drop: 'Drop files here', remove: 'Remove' },
  cascadeSelect: {
    empty: 'No options',
    clear: 'Clear selection',
    selectedCount: '{count} selected',
  },
  treeSelect: { clear: 'Clear selection' },
  chip: { remove: 'Remove' },
  splitButton: { more: 'More actions' },
  breadcrumb: { label: 'Breadcrumb' },
  commandPalette: { placeholder: 'Search…', empty: 'No results', label: 'Command palette' },
  colorPicker: {
    saturationAndBrightness: 'Saturation and brightness',
    saturation: 'saturation',
    brightness: 'brightness',
    hue: 'Hue',
    hex: 'Hex color',
    pickFromScreen: 'Pick a color from the screen',
  },
  tour: {
    next: 'Next',
    back: 'Back',
    skip: 'Skip',
    done: 'Done',
    stepOf: 'Step {current} of {total}',
  },
  toaster: { label: 'Notifications' },
  pagination: {
    label: 'Pagination',
    first: 'First page',
    previous: 'Previous page',
    page: 'Page {page}',
    next: 'Next page',
    last: 'Last page',
    pageSize: 'Rows per page',
  },
  datePicker: {
    chooseDate: 'Choose date',
    today: 'Today',
    clear: 'Clear',
    hour: 'Hour',
    minute: 'Minute',
    increaseHour: 'Increase hour',
    decreaseHour: 'Decrease hour',
    increaseMinute: 'Increase minute',
    decreaseMinute: 'Decrease minute',
  },
  dataTable: {
    selectAll: 'Select all rows',
    selectRow: 'Select row',
    collapseRow: 'Collapse row',
    expandRow: 'Expand row',
    loading: 'Loading…',
  },
  sortable: {
    instructions:
      'Press Space or Enter to start reordering. Use the arrow keys to move, Space to drop, Escape to cancel.',
    grabbed: 'Grabbed {label}. Position {position} of {total}.',
    moved: '{label} moved to position {position} of {total}.',
    movedToLevel: '{label} moved to position {position} of {total}, level {depth}.',
    dropped: 'Dropped {label} at position {position} of {total}.',
    cancelled: 'Reordering cancelled. {label} returned to its original position.',
  },
  rating: { valueText: '{value} of {max}' },
  slider: { minimum: 'Minimum', maximum: 'Maximum' },
  calendar: {
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    previousYear: 'Previous year',
    nextYear: 'Next year',
    previousYears: 'Previous years',
    nextYears: 'Next years',
  },
}

export const messagesKey: InjectionKey<Ref<UiMessages>> = Symbol('ui-messages')

/**
 * Resolve the active message catalog. Falls back to English defaults when no
 * `ConfigProvider` (or manual `provide(messagesKey, ...)`) is above us.
 */
export function useUiMessages(): Ref<UiMessages> {
  // Shallow: the defaults never change, and a deep ref would make the shared
  // module object reactive, which keeps each server render's computeds alive.
  return inject(messagesKey, () => shallowRef(defaultMessages), true)
}

export function mergeMessages(base: UiMessages, overrides?: PartialUiMessages): UiMessages {
  if (!overrides) return base
  return {
    dialog: { ...base.dialog, ...overrides.dialog },
    toast: { ...base.toast, ...overrides.toast },
    message: { ...base.message, ...overrides.message },
    pullToRefresh: { ...base.pullToRefresh, ...overrides.pullToRefresh },
    inputNumber: { ...base.inputNumber, ...overrides.inputNumber },
    passwordInput: { ...base.passwordInput, ...overrides.passwordInput },
    select: { ...base.select, ...overrides.select },
    combobox: { ...base.combobox, ...overrides.combobox },
    fileUpload: { ...base.fileUpload, ...overrides.fileUpload },
    cascadeSelect: { ...base.cascadeSelect, ...overrides.cascadeSelect },
    treeSelect: { ...base.treeSelect, ...overrides.treeSelect },
    chip: { ...base.chip, ...overrides.chip },
    splitButton: { ...base.splitButton, ...overrides.splitButton },
    breadcrumb: { ...base.breadcrumb, ...overrides.breadcrumb },
    commandPalette: { ...base.commandPalette, ...overrides.commandPalette },
    colorPicker: { ...base.colorPicker, ...overrides.colorPicker },
    tour: { ...base.tour, ...overrides.tour },
    toaster: { ...base.toaster, ...overrides.toaster },
    pagination: { ...base.pagination, ...overrides.pagination },
    datePicker: { ...base.datePicker, ...overrides.datePicker },
    dataTable: { ...base.dataTable, ...overrides.dataTable },
    sortable: { ...base.sortable, ...overrides.sortable },
    rating: { ...base.rating, ...overrides.rating },
    slider: { ...base.slider, ...overrides.slider },
    calendar: { ...base.calendar, ...overrides.calendar },
  }
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
 * Where each of our strings lives in the CONSUMER's own i18n catalog. An app
 * that wants translated vael-ui strings adds these paths (nested under `uiKit`)
 * to its existing locale files — one catalog, not two. A key that isn't
 * there falls back to our English default instead of leaking the raw path.
 */
const i18nKeyMap: { [K in keyof UiMessages]: { [F in keyof UiMessages[K]]: string } } = {
  dialog: {
    close: 'uiKit.dialog.close',
    maximize: 'uiKit.dialog.maximize',
    restore: 'uiKit.dialog.restore',
  },
  toast: { dismiss: 'uiKit.toast.dismiss' },
  message: { dismiss: 'uiKit.message.dismiss' },
  pullToRefresh: {
    pull: 'uiKit.pullToRefresh.pull',
    release: 'uiKit.pullToRefresh.release',
    refreshing: 'uiKit.pullToRefresh.refreshing',
    updated: 'uiKit.pullToRefresh.updated',
  },
  inputNumber: {
    increment: 'uiKit.inputNumber.increment',
    decrement: 'uiKit.inputNumber.decrement',
  },
  passwordInput: {
    show: 'uiKit.passwordInput.show',
    hide: 'uiKit.passwordInput.hide',
  },
  select: {
    empty: 'uiKit.select.empty',
    clear: 'uiKit.select.clear',
    selectedCount: 'uiKit.select.selectedCount',
  },
  combobox: {
    empty: 'uiKit.combobox.empty',
    clear: 'uiKit.combobox.clear',
    toggle: 'uiKit.combobox.toggle',
    create: 'uiKit.combobox.create',
  },
  fileUpload: {
    browse: 'uiKit.fileUpload.browse',
    drop: 'uiKit.fileUpload.drop',
    remove: 'uiKit.fileUpload.remove',
  },
  cascadeSelect: {
    empty: 'uiKit.cascadeSelect.empty',
    clear: 'uiKit.cascadeSelect.clear',
    selectedCount: 'uiKit.cascadeSelect.selectedCount',
  },
  treeSelect: { clear: 'uiKit.treeSelect.clear' },
  chip: { remove: 'uiKit.chip.remove' },
  splitButton: { more: 'uiKit.splitButton.more' },
  breadcrumb: { label: 'uiKit.breadcrumb.label' },
  commandPalette: {
    placeholder: 'uiKit.commandPalette.placeholder',
    empty: 'uiKit.commandPalette.empty',
    label: 'uiKit.commandPalette.label',
  },
  colorPicker: {
    saturationAndBrightness: 'uiKit.colorPicker.saturationAndBrightness',
    saturation: 'uiKit.colorPicker.saturation',
    brightness: 'uiKit.colorPicker.brightness',
    hue: 'uiKit.colorPicker.hue',
    hex: 'uiKit.colorPicker.hex',
    pickFromScreen: 'uiKit.colorPicker.pickFromScreen',
  },
  tour: {
    next: 'uiKit.tour.next',
    back: 'uiKit.tour.back',
    skip: 'uiKit.tour.skip',
    done: 'uiKit.tour.done',
    stepOf: 'uiKit.tour.stepOf',
  },
  toaster: { label: 'uiKit.toaster.label' },
  pagination: {
    label: 'uiKit.pagination.label',
    first: 'uiKit.pagination.first',
    previous: 'uiKit.pagination.previous',
    page: 'uiKit.pagination.page',
    next: 'uiKit.pagination.next',
    last: 'uiKit.pagination.last',
    pageSize: 'uiKit.pagination.pageSize',
  },
  datePicker: {
    chooseDate: 'uiKit.datePicker.chooseDate',
    today: 'uiKit.datePicker.today',
    clear: 'uiKit.datePicker.clear',
    hour: 'uiKit.datePicker.hour',
    minute: 'uiKit.datePicker.minute',
    increaseHour: 'uiKit.datePicker.increaseHour',
    decreaseHour: 'uiKit.datePicker.decreaseHour',
    increaseMinute: 'uiKit.datePicker.increaseMinute',
    decreaseMinute: 'uiKit.datePicker.decreaseMinute',
  },
  dataTable: {
    selectAll: 'uiKit.dataTable.selectAll',
    selectRow: 'uiKit.dataTable.selectRow',
    collapseRow: 'uiKit.dataTable.collapseRow',
    expandRow: 'uiKit.dataTable.expandRow',
    loading: 'uiKit.dataTable.loading',
  },
  sortable: {
    instructions: 'uiKit.sortable.instructions',
    grabbed: 'uiKit.sortable.grabbed',
    moved: 'uiKit.sortable.moved',
    movedToLevel: 'uiKit.sortable.movedToLevel',
    dropped: 'uiKit.sortable.dropped',
    cancelled: 'uiKit.sortable.cancelled',
  },
  rating: { valueText: 'uiKit.rating.valueText' },
  slider: { minimum: 'uiKit.slider.minimum', maximum: 'uiKit.slider.maximum' },
  calendar: {
    previousMonth: 'uiKit.calendar.previousMonth',
    nextMonth: 'uiKit.calendar.nextMonth',
    previousYear: 'uiKit.calendar.previousYear',
    nextYear: 'uiKit.calendar.nextYear',
    previousYears: 'uiKit.calendar.previousYears',
    nextYears: 'uiKit.calendar.nextYears',
  },
}

// vue-i18n reads these options and skips its missing-key warning, since a missing key just means
// our English default. Libraries whose `t` takes only a key ignore them.
const quiet = { missingWarn: false, fallbackWarn: false }
declare const process: { env: { NODE_ENV?: string } }
// Bundlers replace `process.env.NODE_ENV` with the app's mode, so this is `false` in production
// builds. Without a bundler `process` doesn't exist; that counts as production.
function isDev(): boolean {
  try {
    return process.env.NODE_ENV !== 'production'
  } catch {
    return false
  }
}
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
  const result: PartialUiMessages = {}
  const missing: string[] = []
  let found = 0
  const t = (key: string) => {
    const text = (i18n.t as (key: string, named: object, options: object) => string)(key, {}, quiet)
    if (text === key) missing.push(key)
    else found++
    return text
  }

  const close = t(i18nKeyMap.dialog.close)
  const maximize = t(i18nKeyMap.dialog.maximize)
  const restore = t(i18nKeyMap.dialog.restore)
  const dialog: PartialUiMessages['dialog'] = {}
  if (close !== i18nKeyMap.dialog.close) dialog.close = close
  if (maximize !== i18nKeyMap.dialog.maximize) dialog.maximize = maximize
  if (restore !== i18nKeyMap.dialog.restore) dialog.restore = restore
  if (Object.keys(dialog).length > 0) result.dialog = dialog

  const dismiss = t(i18nKeyMap.toast.dismiss)
  if (dismiss !== i18nKeyMap.toast.dismiss) result.toast = { dismiss }

  const messageDismiss = t(i18nKeyMap.message.dismiss)
  if (messageDismiss !== i18nKeyMap.message.dismiss) result.message = { dismiss: messageDismiss }

  const pull = t(i18nKeyMap.pullToRefresh.pull)
  const release = t(i18nKeyMap.pullToRefresh.release)
  const refreshing = t(i18nKeyMap.pullToRefresh.refreshing)
  const updated = t(i18nKeyMap.pullToRefresh.updated)
  const pullToRefresh: PartialUiMessages['pullToRefresh'] = {}
  if (pull !== i18nKeyMap.pullToRefresh.pull) pullToRefresh.pull = pull
  if (release !== i18nKeyMap.pullToRefresh.release) pullToRefresh.release = release
  if (refreshing !== i18nKeyMap.pullToRefresh.refreshing) pullToRefresh.refreshing = refreshing
  if (updated !== i18nKeyMap.pullToRefresh.updated) pullToRefresh.updated = updated
  if (Object.keys(pullToRefresh).length > 0) result.pullToRefresh = pullToRefresh

  const increment = t(i18nKeyMap.inputNumber.increment)
  const decrement = t(i18nKeyMap.inputNumber.decrement)
  const inputNumber: PartialUiMessages['inputNumber'] = {}
  if (increment !== i18nKeyMap.inputNumber.increment) inputNumber.increment = increment
  if (decrement !== i18nKeyMap.inputNumber.decrement) inputNumber.decrement = decrement
  if (Object.keys(inputNumber).length > 0) result.inputNumber = inputNumber

  const show = t(i18nKeyMap.passwordInput.show)
  const hide = t(i18nKeyMap.passwordInput.hide)
  const passwordInput: PartialUiMessages['passwordInput'] = {}
  if (show !== i18nKeyMap.passwordInput.show) passwordInput.show = show
  if (hide !== i18nKeyMap.passwordInput.hide) passwordInput.hide = hide
  if (Object.keys(passwordInput).length > 0) result.passwordInput = passwordInput

  const selectEmpty = t(i18nKeyMap.select.empty)
  const selectClear = t(i18nKeyMap.select.clear)
  const selectSelectedCount = t(i18nKeyMap.select.selectedCount)
  const select: PartialUiMessages['select'] = {}
  if (selectEmpty !== i18nKeyMap.select.empty) select.empty = selectEmpty
  if (selectClear !== i18nKeyMap.select.clear) select.clear = selectClear
  if (selectSelectedCount !== i18nKeyMap.select.selectedCount)
    select.selectedCount = selectSelectedCount
  if (Object.keys(select).length > 0) result.select = select

  const comboboxEmpty = t(i18nKeyMap.combobox.empty)
  const comboboxClear = t(i18nKeyMap.combobox.clear)
  const comboboxToggle = t(i18nKeyMap.combobox.toggle)
  const comboboxCreate = t(i18nKeyMap.combobox.create)
  const combobox: PartialUiMessages['combobox'] = {}
  if (comboboxEmpty !== i18nKeyMap.combobox.empty) combobox.empty = comboboxEmpty
  if (comboboxClear !== i18nKeyMap.combobox.clear) combobox.clear = comboboxClear
  if (comboboxToggle !== i18nKeyMap.combobox.toggle) combobox.toggle = comboboxToggle
  if (comboboxCreate !== i18nKeyMap.combobox.create) combobox.create = comboboxCreate
  if (Object.keys(combobox).length > 0) result.combobox = combobox

  const fileUploadBrowse = t(i18nKeyMap.fileUpload.browse)
  const fileUploadDrop = t(i18nKeyMap.fileUpload.drop)
  const fileUploadRemove = t(i18nKeyMap.fileUpload.remove)
  const fileUpload: PartialUiMessages['fileUpload'] = {}
  if (fileUploadBrowse !== i18nKeyMap.fileUpload.browse) fileUpload.browse = fileUploadBrowse
  if (fileUploadDrop !== i18nKeyMap.fileUpload.drop) fileUpload.drop = fileUploadDrop
  if (fileUploadRemove !== i18nKeyMap.fileUpload.remove) fileUpload.remove = fileUploadRemove
  if (Object.keys(fileUpload).length > 0) result.fileUpload = fileUpload

  const cascadeEmpty = t(i18nKeyMap.cascadeSelect.empty)
  const cascadeClear = t(i18nKeyMap.cascadeSelect.clear)
  const cascadeSelectedCount = t(i18nKeyMap.cascadeSelect.selectedCount)
  const cascadeSelect: PartialUiMessages['cascadeSelect'] = {}
  if (cascadeEmpty !== i18nKeyMap.cascadeSelect.empty) cascadeSelect.empty = cascadeEmpty
  if (cascadeClear !== i18nKeyMap.cascadeSelect.clear) cascadeSelect.clear = cascadeClear
  if (cascadeSelectedCount !== i18nKeyMap.cascadeSelect.selectedCount) {
    cascadeSelect.selectedCount = cascadeSelectedCount
  }
  if (Object.keys(cascadeSelect).length > 0) result.cascadeSelect = cascadeSelect

  const treeSelectClear = t(i18nKeyMap.treeSelect.clear)
  if (treeSelectClear !== i18nKeyMap.treeSelect.clear) {
    result.treeSelect = { clear: treeSelectClear }
  }

  const chipRemove = t(i18nKeyMap.chip.remove)
  if (chipRemove !== i18nKeyMap.chip.remove) result.chip = { remove: chipRemove }

  const splitButtonMore = t(i18nKeyMap.splitButton.more)
  if (splitButtonMore !== i18nKeyMap.splitButton.more) {
    result.splitButton = { more: splitButtonMore }
  }

  const breadcrumbLabel = t(i18nKeyMap.breadcrumb.label)
  if (breadcrumbLabel !== i18nKeyMap.breadcrumb.label) {
    result.breadcrumb = { label: breadcrumbLabel }
  }

  const commandPalettePlaceholder = t(i18nKeyMap.commandPalette.placeholder)
  const commandPaletteEmpty = t(i18nKeyMap.commandPalette.empty)
  const commandPalette: PartialUiMessages['commandPalette'] = {}
  if (commandPalettePlaceholder !== i18nKeyMap.commandPalette.placeholder) {
    commandPalette.placeholder = commandPalettePlaceholder
  }
  if (commandPaletteEmpty !== i18nKeyMap.commandPalette.empty) {
    commandPalette.empty = commandPaletteEmpty
  }
  const commandPaletteLabel = t(i18nKeyMap.commandPalette.label)
  if (commandPaletteLabel !== i18nKeyMap.commandPalette.label) {
    commandPalette.label = commandPaletteLabel
  }
  if (Object.keys(commandPalette).length > 0) result.commandPalette = commandPalette

  const tourNext = t(i18nKeyMap.tour.next)
  const tourBack = t(i18nKeyMap.tour.back)
  const tourSkip = t(i18nKeyMap.tour.skip)
  const tourDone = t(i18nKeyMap.tour.done)
  const tourStepOf = t(i18nKeyMap.tour.stepOf)
  const tour: PartialUiMessages['tour'] = {}
  if (tourNext !== i18nKeyMap.tour.next) tour.next = tourNext
  if (tourBack !== i18nKeyMap.tour.back) tour.back = tourBack
  if (tourSkip !== i18nKeyMap.tour.skip) tour.skip = tourSkip
  if (tourDone !== i18nKeyMap.tour.done) tour.done = tourDone
  if (tourStepOf !== i18nKeyMap.tour.stepOf) tour.stepOf = tourStepOf
  if (Object.keys(tour).length > 0) result.tour = tour

  const toasterLabel = t(i18nKeyMap.toaster.label)
  if (toasterLabel !== i18nKeyMap.toaster.label) result.toaster = { label: toasterLabel }

  const paginationLabel = t(i18nKeyMap.pagination.label)
  const paginationFirst = t(i18nKeyMap.pagination.first)
  const paginationPrevious = t(i18nKeyMap.pagination.previous)
  const paginationPage = t(i18nKeyMap.pagination.page)
  const paginationNext = t(i18nKeyMap.pagination.next)
  const paginationLast = t(i18nKeyMap.pagination.last)
  const paginationPageSize = t(i18nKeyMap.pagination.pageSize)
  const pagination: PartialUiMessages['pagination'] = {}
  if (paginationLabel !== i18nKeyMap.pagination.label) pagination.label = paginationLabel
  if (paginationFirst !== i18nKeyMap.pagination.first) pagination.first = paginationFirst
  if (paginationPrevious !== i18nKeyMap.pagination.previous) {
    pagination.previous = paginationPrevious
  }
  if (paginationPage !== i18nKeyMap.pagination.page) pagination.page = paginationPage
  if (paginationNext !== i18nKeyMap.pagination.next) pagination.next = paginationNext
  if (paginationLast !== i18nKeyMap.pagination.last) pagination.last = paginationLast
  if (paginationPageSize !== i18nKeyMap.pagination.pageSize) {
    pagination.pageSize = paginationPageSize
  }
  if (Object.keys(pagination).length > 0) result.pagination = pagination

  const chooseDate = t(i18nKeyMap.datePicker.chooseDate)
  const datePickerToday = t(i18nKeyMap.datePicker.today)
  const datePickerClear = t(i18nKeyMap.datePicker.clear)
  const datePickerHour = t(i18nKeyMap.datePicker.hour)
  const datePickerMinute = t(i18nKeyMap.datePicker.minute)
  const datePickerIncreaseHour = t(i18nKeyMap.datePicker.increaseHour)
  const datePickerDecreaseHour = t(i18nKeyMap.datePicker.decreaseHour)
  const datePickerIncreaseMinute = t(i18nKeyMap.datePicker.increaseMinute)
  const datePickerDecreaseMinute = t(i18nKeyMap.datePicker.decreaseMinute)
  const datePicker: PartialUiMessages['datePicker'] = {}
  if (chooseDate !== i18nKeyMap.datePicker.chooseDate) datePicker.chooseDate = chooseDate
  if (datePickerToday !== i18nKeyMap.datePicker.today) datePicker.today = datePickerToday
  if (datePickerClear !== i18nKeyMap.datePicker.clear) datePicker.clear = datePickerClear
  if (datePickerHour !== i18nKeyMap.datePicker.hour) datePicker.hour = datePickerHour
  if (datePickerMinute !== i18nKeyMap.datePicker.minute) datePicker.minute = datePickerMinute
  if (datePickerIncreaseHour !== i18nKeyMap.datePicker.increaseHour) {
    datePicker.increaseHour = datePickerIncreaseHour
  }
  if (datePickerDecreaseHour !== i18nKeyMap.datePicker.decreaseHour) {
    datePicker.decreaseHour = datePickerDecreaseHour
  }
  if (datePickerIncreaseMinute !== i18nKeyMap.datePicker.increaseMinute) {
    datePicker.increaseMinute = datePickerIncreaseMinute
  }
  if (datePickerDecreaseMinute !== i18nKeyMap.datePicker.decreaseMinute) {
    datePicker.decreaseMinute = datePickerDecreaseMinute
  }
  if (Object.keys(datePicker).length > 0) result.datePicker = datePicker

  const dataTableSelectAll = t(i18nKeyMap.dataTable.selectAll)
  const dataTableSelectRow = t(i18nKeyMap.dataTable.selectRow)
  const dataTableCollapseRow = t(i18nKeyMap.dataTable.collapseRow)
  const dataTableExpandRow = t(i18nKeyMap.dataTable.expandRow)
  const dataTableLoading = t(i18nKeyMap.dataTable.loading)
  const dataTable: PartialUiMessages['dataTable'] = {}
  if (dataTableSelectAll !== i18nKeyMap.dataTable.selectAll) {
    dataTable.selectAll = dataTableSelectAll
  }
  if (dataTableSelectRow !== i18nKeyMap.dataTable.selectRow) {
    dataTable.selectRow = dataTableSelectRow
  }
  if (dataTableCollapseRow !== i18nKeyMap.dataTable.collapseRow) {
    dataTable.collapseRow = dataTableCollapseRow
  }
  if (dataTableExpandRow !== i18nKeyMap.dataTable.expandRow) {
    dataTable.expandRow = dataTableExpandRow
  }
  if (dataTableLoading !== i18nKeyMap.dataTable.loading) {
    dataTable.loading = dataTableLoading
  }
  if (Object.keys(dataTable).length > 0) result.dataTable = dataTable

  const sortableInstructions = t(i18nKeyMap.sortable.instructions)
  const sortableGrabbed = t(i18nKeyMap.sortable.grabbed)
  const sortableMoved = t(i18nKeyMap.sortable.moved)
  const sortableMovedToLevel = t(i18nKeyMap.sortable.movedToLevel)
  const sortableDropped = t(i18nKeyMap.sortable.dropped)
  const sortableCancelled = t(i18nKeyMap.sortable.cancelled)
  const sortable: PartialUiMessages['sortable'] = {}
  if (sortableInstructions !== i18nKeyMap.sortable.instructions) {
    sortable.instructions = sortableInstructions
  }
  if (sortableGrabbed !== i18nKeyMap.sortable.grabbed) {
    sortable.grabbed = sortableGrabbed
  }
  if (sortableMoved !== i18nKeyMap.sortable.moved) {
    sortable.moved = sortableMoved
  }
  if (sortableMovedToLevel !== i18nKeyMap.sortable.movedToLevel) {
    sortable.movedToLevel = sortableMovedToLevel
  }
  if (sortableDropped !== i18nKeyMap.sortable.dropped) {
    sortable.dropped = sortableDropped
  }
  if (sortableCancelled !== i18nKeyMap.sortable.cancelled) {
    sortable.cancelled = sortableCancelled
  }
  if (Object.keys(sortable).length > 0) result.sortable = sortable

  const ratingValueText = t(i18nKeyMap.rating.valueText)
  const rating: PartialUiMessages['rating'] = {}
  if (ratingValueText !== i18nKeyMap.rating.valueText) {
    rating.valueText = ratingValueText
  }
  if (Object.keys(rating).length > 0) result.rating = rating

  const sliderMinimum = t(i18nKeyMap.slider.minimum)
  const sliderMaximum = t(i18nKeyMap.slider.maximum)
  const slider: PartialUiMessages['slider'] = {}
  if (sliderMinimum !== i18nKeyMap.slider.minimum) slider.minimum = sliderMinimum
  if (sliderMaximum !== i18nKeyMap.slider.maximum) slider.maximum = sliderMaximum
  if (Object.keys(slider).length > 0) result.slider = slider

  const calendar: PartialUiMessages['calendar'] = {}
  for (const key of Object.keys(i18nKeyMap.calendar) as (keyof UiMessages['calendar'])[]) {
    const text = t(i18nKeyMap.calendar[key])
    if (text !== i18nKeyMap.calendar[key]) calendar[key] = text
  }
  if (Object.keys(calendar).length > 0) result.calendar = calendar

  if (isDev() && found > 0 && missing.length > 0) {
    const locale = toValue(i18n.locale) ?? ''
    if (!warnedLocales.has(locale)) {
      warnedLocales.add(locale)
      // eslint-disable-next-line no-console -- the one dev-only warning, asked for above
      console.warn(
        `vael-ui: ${missing.length} uiKit keys aren't translated${locale ? ` for "${locale}"` : ''}, so they show the English default: ${missing.join(', ')}`,
      )
    }
  }

  return result
}
