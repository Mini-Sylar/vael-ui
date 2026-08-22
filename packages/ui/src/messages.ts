import { inject, ref } from 'vue'
import type { InjectionKey, Ref } from 'vue'

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
  }
  fileUpload: {
    browse: string
    drop: string
    remove: string
  }
  cascadeSelect: {
    empty: string
    clear: string
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
  }
  datePicker: {
    /** aria-label for the trigger button that opens the calendar. */
    chooseDate: string
  }
  dataTable: {
    selectAll: string
    selectRow: string
    collapseRow: string
    expandRow: string
  }
  /** Drag-to-reorder. These carry `{label}`, `{position}`, `{total}` and `{depth}` placeholders rather than being functions, so a consumer's own `i18n.t()` can return them as plain strings like every other entry here. */
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
  combobox: { empty: 'No results', clear: 'Clear selection', toggle: 'Toggle options' },
  fileUpload: { browse: 'Browse files', drop: 'Drop files here', remove: 'Remove' },
  cascadeSelect: { empty: 'No options', clear: 'Clear selection' },
  treeSelect: { clear: 'Clear selection' },
  chip: { remove: 'Remove' },
  splitButton: { more: 'More actions' },
  breadcrumb: { label: 'Breadcrumb' },
  commandPalette: { placeholder: 'Search…', empty: 'No results' },
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
  },
  datePicker: { chooseDate: 'Choose date' },
  dataTable: {
    selectAll: 'Select all rows',
    selectRow: 'Select row',
    collapseRow: 'Collapse row',
    expandRow: 'Expand row',
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
}

export const messagesKey: InjectionKey<Ref<UiMessages>> = Symbol('ui-messages')

/**
 * Resolve the active message catalog. Falls back to English defaults when no
 * `ConfigProvider` (or manual `provide(messagesKey, ...)`) is above us.
 */
export function useUiMessages(): Ref<UiMessages> {
  return inject(messagesKey, () => ref(defaultMessages), true)
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
    tour: { ...base.tour, ...overrides.tour },
    toaster: { ...base.toaster, ...overrides.toaster },
    pagination: { ...base.pagination, ...overrides.pagination },
    datePicker: { ...base.datePicker, ...overrides.datePicker },
    dataTable: { ...base.dataTable, ...overrides.dataTable },
    sortable: { ...base.sortable, ...overrides.sortable },
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
  },
  fileUpload: {
    browse: 'uiKit.fileUpload.browse',
    drop: 'uiKit.fileUpload.drop',
    remove: 'uiKit.fileUpload.remove',
  },
  cascadeSelect: { empty: 'uiKit.cascadeSelect.empty', clear: 'uiKit.cascadeSelect.clear' },
  treeSelect: { clear: 'uiKit.treeSelect.clear' },
  chip: { remove: 'uiKit.chip.remove' },
  splitButton: { more: 'uiKit.splitButton.more' },
  breadcrumb: { label: 'uiKit.breadcrumb.label' },
  commandPalette: {
    placeholder: 'uiKit.commandPalette.placeholder',
    empty: 'uiKit.commandPalette.empty',
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
  },
  datePicker: { chooseDate: 'uiKit.datePicker.chooseDate' },
  dataTable: {
    selectAll: 'uiKit.dataTable.selectAll',
    selectRow: 'uiKit.dataTable.selectRow',
    collapseRow: 'uiKit.dataTable.collapseRow',
    expandRow: 'uiKit.dataTable.expandRow',
  },
  sortable: {
    instructions: 'uiKit.sortable.instructions',
    grabbed: 'uiKit.sortable.grabbed',
    moved: 'uiKit.sortable.moved',
    movedToLevel: 'uiKit.sortable.movedToLevel',
    dropped: 'uiKit.sortable.dropped',
    cancelled: 'uiKit.sortable.cancelled',
  },
}

/**
 * Calls `i18n.t()` for each of our known keys. A missing translation is
 * detected the way most i18n libraries (vue-i18n included) signal it: `t()`
 * returns the key string itself unchanged — that case is omitted from the
 * result entirely (not set to `undefined`) so `mergeMessages` falls through
 * to the English default instead of clobbering it with an empty value.
 */
export function resolveMessagesFromI18n(i18n: I18nInstance): PartialUiMessages {
  const result: PartialUiMessages = {}

  const close = i18n.t(i18nKeyMap.dialog.close)
  const maximize = i18n.t(i18nKeyMap.dialog.maximize)
  const restore = i18n.t(i18nKeyMap.dialog.restore)
  const dialog: PartialUiMessages['dialog'] = {}
  if (close !== i18nKeyMap.dialog.close) dialog.close = close
  if (maximize !== i18nKeyMap.dialog.maximize) dialog.maximize = maximize
  if (restore !== i18nKeyMap.dialog.restore) dialog.restore = restore
  if (Object.keys(dialog).length > 0) result.dialog = dialog

  const dismiss = i18n.t(i18nKeyMap.toast.dismiss)
  if (dismiss !== i18nKeyMap.toast.dismiss) result.toast = { dismiss }

  const messageDismiss = i18n.t(i18nKeyMap.message.dismiss)
  if (messageDismiss !== i18nKeyMap.message.dismiss) result.message = { dismiss: messageDismiss }

  const pull = i18n.t(i18nKeyMap.pullToRefresh.pull)
  const release = i18n.t(i18nKeyMap.pullToRefresh.release)
  const refreshing = i18n.t(i18nKeyMap.pullToRefresh.refreshing)
  const updated = i18n.t(i18nKeyMap.pullToRefresh.updated)
  const pullToRefresh: PartialUiMessages['pullToRefresh'] = {}
  if (pull !== i18nKeyMap.pullToRefresh.pull) pullToRefresh.pull = pull
  if (release !== i18nKeyMap.pullToRefresh.release) pullToRefresh.release = release
  if (refreshing !== i18nKeyMap.pullToRefresh.refreshing) pullToRefresh.refreshing = refreshing
  if (updated !== i18nKeyMap.pullToRefresh.updated) pullToRefresh.updated = updated
  if (Object.keys(pullToRefresh).length > 0) result.pullToRefresh = pullToRefresh

  const increment = i18n.t(i18nKeyMap.inputNumber.increment)
  const decrement = i18n.t(i18nKeyMap.inputNumber.decrement)
  const inputNumber: PartialUiMessages['inputNumber'] = {}
  if (increment !== i18nKeyMap.inputNumber.increment) inputNumber.increment = increment
  if (decrement !== i18nKeyMap.inputNumber.decrement) inputNumber.decrement = decrement
  if (Object.keys(inputNumber).length > 0) result.inputNumber = inputNumber

  const show = i18n.t(i18nKeyMap.passwordInput.show)
  const hide = i18n.t(i18nKeyMap.passwordInput.hide)
  const passwordInput: PartialUiMessages['passwordInput'] = {}
  if (show !== i18nKeyMap.passwordInput.show) passwordInput.show = show
  if (hide !== i18nKeyMap.passwordInput.hide) passwordInput.hide = hide
  if (Object.keys(passwordInput).length > 0) result.passwordInput = passwordInput

  const selectEmpty = i18n.t(i18nKeyMap.select.empty)
  const selectClear = i18n.t(i18nKeyMap.select.clear)
  const selectSelectedCount = i18n.t(i18nKeyMap.select.selectedCount)
  const select: PartialUiMessages['select'] = {}
  if (selectEmpty !== i18nKeyMap.select.empty) select.empty = selectEmpty
  if (selectClear !== i18nKeyMap.select.clear) select.clear = selectClear
  if (selectSelectedCount !== i18nKeyMap.select.selectedCount)
    select.selectedCount = selectSelectedCount
  if (Object.keys(select).length > 0) result.select = select

  const comboboxEmpty = i18n.t(i18nKeyMap.combobox.empty)
  const comboboxClear = i18n.t(i18nKeyMap.combobox.clear)
  const comboboxToggle = i18n.t(i18nKeyMap.combobox.toggle)
  const combobox: PartialUiMessages['combobox'] = {}
  if (comboboxEmpty !== i18nKeyMap.combobox.empty) combobox.empty = comboboxEmpty
  if (comboboxClear !== i18nKeyMap.combobox.clear) combobox.clear = comboboxClear
  if (comboboxToggle !== i18nKeyMap.combobox.toggle) combobox.toggle = comboboxToggle
  if (Object.keys(combobox).length > 0) result.combobox = combobox

  const fileUploadBrowse = i18n.t(i18nKeyMap.fileUpload.browse)
  const fileUploadDrop = i18n.t(i18nKeyMap.fileUpload.drop)
  const fileUploadRemove = i18n.t(i18nKeyMap.fileUpload.remove)
  const fileUpload: PartialUiMessages['fileUpload'] = {}
  if (fileUploadBrowse !== i18nKeyMap.fileUpload.browse) fileUpload.browse = fileUploadBrowse
  if (fileUploadDrop !== i18nKeyMap.fileUpload.drop) fileUpload.drop = fileUploadDrop
  if (fileUploadRemove !== i18nKeyMap.fileUpload.remove) fileUpload.remove = fileUploadRemove
  if (Object.keys(fileUpload).length > 0) result.fileUpload = fileUpload

  const cascadeEmpty = i18n.t(i18nKeyMap.cascadeSelect.empty)
  const cascadeClear = i18n.t(i18nKeyMap.cascadeSelect.clear)
  const cascadeSelect: PartialUiMessages['cascadeSelect'] = {}
  if (cascadeEmpty !== i18nKeyMap.cascadeSelect.empty) cascadeSelect.empty = cascadeEmpty
  if (cascadeClear !== i18nKeyMap.cascadeSelect.clear) cascadeSelect.clear = cascadeClear
  if (Object.keys(cascadeSelect).length > 0) result.cascadeSelect = cascadeSelect

  const treeSelectClear = i18n.t(i18nKeyMap.treeSelect.clear)
  if (treeSelectClear !== i18nKeyMap.treeSelect.clear) {
    result.treeSelect = { clear: treeSelectClear }
  }

  const chipRemove = i18n.t(i18nKeyMap.chip.remove)
  if (chipRemove !== i18nKeyMap.chip.remove) result.chip = { remove: chipRemove }

  const splitButtonMore = i18n.t(i18nKeyMap.splitButton.more)
  if (splitButtonMore !== i18nKeyMap.splitButton.more) {
    result.splitButton = { more: splitButtonMore }
  }

  const breadcrumbLabel = i18n.t(i18nKeyMap.breadcrumb.label)
  if (breadcrumbLabel !== i18nKeyMap.breadcrumb.label) {
    result.breadcrumb = { label: breadcrumbLabel }
  }

  const commandPalettePlaceholder = i18n.t(i18nKeyMap.commandPalette.placeholder)
  const commandPaletteEmpty = i18n.t(i18nKeyMap.commandPalette.empty)
  const commandPalette: PartialUiMessages['commandPalette'] = {}
  if (commandPalettePlaceholder !== i18nKeyMap.commandPalette.placeholder) {
    commandPalette.placeholder = commandPalettePlaceholder
  }
  if (commandPaletteEmpty !== i18nKeyMap.commandPalette.empty) {
    commandPalette.empty = commandPaletteEmpty
  }
  if (Object.keys(commandPalette).length > 0) result.commandPalette = commandPalette

  const tourNext = i18n.t(i18nKeyMap.tour.next)
  const tourBack = i18n.t(i18nKeyMap.tour.back)
  const tourSkip = i18n.t(i18nKeyMap.tour.skip)
  const tourDone = i18n.t(i18nKeyMap.tour.done)
  const tourStepOf = i18n.t(i18nKeyMap.tour.stepOf)
  const tour: PartialUiMessages['tour'] = {}
  if (tourNext !== i18nKeyMap.tour.next) tour.next = tourNext
  if (tourBack !== i18nKeyMap.tour.back) tour.back = tourBack
  if (tourSkip !== i18nKeyMap.tour.skip) tour.skip = tourSkip
  if (tourDone !== i18nKeyMap.tour.done) tour.done = tourDone
  if (tourStepOf !== i18nKeyMap.tour.stepOf) tour.stepOf = tourStepOf
  if (Object.keys(tour).length > 0) result.tour = tour

  const toasterLabel = i18n.t(i18nKeyMap.toaster.label)
  if (toasterLabel !== i18nKeyMap.toaster.label) result.toaster = { label: toasterLabel }

  const paginationLabel = i18n.t(i18nKeyMap.pagination.label)
  const paginationFirst = i18n.t(i18nKeyMap.pagination.first)
  const paginationPrevious = i18n.t(i18nKeyMap.pagination.previous)
  const paginationPage = i18n.t(i18nKeyMap.pagination.page)
  const paginationNext = i18n.t(i18nKeyMap.pagination.next)
  const paginationLast = i18n.t(i18nKeyMap.pagination.last)
  const pagination: PartialUiMessages['pagination'] = {}
  if (paginationLabel !== i18nKeyMap.pagination.label) pagination.label = paginationLabel
  if (paginationFirst !== i18nKeyMap.pagination.first) pagination.first = paginationFirst
  if (paginationPrevious !== i18nKeyMap.pagination.previous) {
    pagination.previous = paginationPrevious
  }
  if (paginationPage !== i18nKeyMap.pagination.page) pagination.page = paginationPage
  if (paginationNext !== i18nKeyMap.pagination.next) pagination.next = paginationNext
  if (paginationLast !== i18nKeyMap.pagination.last) pagination.last = paginationLast
  if (Object.keys(pagination).length > 0) result.pagination = pagination

  const chooseDate = i18n.t(i18nKeyMap.datePicker.chooseDate)
  if (chooseDate !== i18nKeyMap.datePicker.chooseDate) {
    result.datePicker = { chooseDate }
  }

  const dataTableSelectAll = i18n.t(i18nKeyMap.dataTable.selectAll)
  const dataTableSelectRow = i18n.t(i18nKeyMap.dataTable.selectRow)
  const dataTableCollapseRow = i18n.t(i18nKeyMap.dataTable.collapseRow)
  const dataTableExpandRow = i18n.t(i18nKeyMap.dataTable.expandRow)
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
  if (Object.keys(dataTable).length > 0) result.dataTable = dataTable

  const sortableInstructions = i18n.t(i18nKeyMap.sortable.instructions)
  const sortableGrabbed = i18n.t(i18nKeyMap.sortable.grabbed)
  const sortableMoved = i18n.t(i18nKeyMap.sortable.moved)
  const sortableMovedToLevel = i18n.t(i18nKeyMap.sortable.movedToLevel)
  const sortableDropped = i18n.t(i18nKeyMap.sortable.dropped)
  const sortableCancelled = i18n.t(i18nKeyMap.sortable.cancelled)
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

  return result
}
