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
  select: { empty: 'No options', clear: 'Clear selection', selectedCount: '{count} selected' },
  combobox: { empty: 'No results', clear: 'Clear selection', toggle: 'Toggle options' },
  fileUpload: { browse: 'Browse files', drop: 'Drop files here', remove: 'Remove' },
  cascadeSelect: { empty: 'No options', clear: 'Clear selection' },
  treeSelect: { clear: 'Clear selection' },
  chip: { remove: 'Remove' },
  splitButton: { more: 'More actions' },
  breadcrumb: { label: 'Breadcrumb' },
  commandPalette: { placeholder: 'Search…', empty: 'No results' },
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
    select: { ...base.select, ...overrides.select },
    combobox: { ...base.combobox, ...overrides.combobox },
    fileUpload: { ...base.fileUpload, ...overrides.fileUpload },
    cascadeSelect: { ...base.cascadeSelect, ...overrides.cascadeSelect },
    treeSelect: { ...base.treeSelect, ...overrides.treeSelect },
    chip: { ...base.chip, ...overrides.chip },
    splitButton: { ...base.splitButton, ...overrides.splitButton },
    breadcrumb: { ...base.breadcrumb, ...overrides.breadcrumb },
    commandPalette: { ...base.commandPalette, ...overrides.commandPalette },
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

  return result
}
