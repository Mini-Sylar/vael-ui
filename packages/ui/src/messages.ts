import { inject, shallowRef, toValue } from 'vue'
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

export const defaultMessages: UiMessages = {
  button: { hold: 'Press and hold to confirm' },
  dialog: { close: 'Close', maximize: 'Maximize', restore: 'Restore' },
  toast: { dismiss: 'Dismiss' },
  message: { dismiss: 'Dismiss' },
  pullToRefresh: {
    pull: 'Pull to refresh',
    release: 'Release to refresh',
    refreshing: 'Refreshing…',
    updated: 'Updated',
  },
  input: { clear: 'Clear' },
  inputNumber: { increment: 'Increase', decrement: 'Decrease' },
  passwordInput: { show: 'Show password', hide: 'Hide password', met: 'met', unmet: 'not met' },
  select: { empty: 'No options', clear: 'Clear selection', selectedCount: '{count} selected' },
  combobox: {
    empty: 'No results',
    clear: 'Clear selection',
    toggle: 'Toggle options',
    create: 'Create "{query}"',
  },
  fileUpload: {
    browse: 'Browse files',
    drop: 'Drop files here',
    remove: 'Remove',
    rejectedAccept: '{name} wasn’t added: that type of file isn’t accepted.',
    rejectedMaxSize: '{name} wasn’t added: it’s too large.',
    rejectedMaxFiles: '{name} wasn’t added: there are already as many files as allowed.',
  },
  cascadeSelect: {
    empty: 'No options',
    clear: 'Clear selection',
    selectedCount: '{count} selected',
  },
  treeSelect: { clear: 'Clear selection', selectedCount: '{count} selected' },
  speedDial: { label: 'Actions' },
  toolbar: { more: 'More' },
  stepper: { completed: 'Completed' },
  bottomSheet: { resize: 'Resize sheet' },
  resizable: { label: 'Resize' },
  chip: { remove: 'Remove' },
  splitButton: { more: 'More actions' },
  breadcrumb: { label: 'Breadcrumb' },
  commandPalette: {
    placeholder: 'Search…',
    empty: 'No results',
    label: 'Command palette',
    results: '{count} results',
  },
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
    columnWidth: '{label}: {width} pixels',
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
    weekNumber: 'Week {week}',
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
