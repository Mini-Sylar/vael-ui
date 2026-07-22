import './style.css'

export { default as Button } from './components/Button.vue'
export type { ButtonLoaderPlacement, ButtonSize, ButtonVariant } from './components/Button.vue'
export { default as SplitButton } from './components/SplitButton.vue'
export type { SplitButtonAlign, SplitButtonSide } from './components/SplitButton.vue'
export { default as Loader } from './components/Loader.vue'
export { default as Skeleton } from './components/Skeleton.vue'
export { default as Badge } from './components/Badge.vue'
export { default as Tag } from './components/Tag.vue'
export { default as Kbd } from './components/Kbd.vue'
export { default as Avatar } from './components/Avatar.vue'
export { default as Card } from './components/Card.vue'
export { default as Separator } from './components/Separator.vue'
export { default as Progress } from './components/Progress.vue'
export { default as Message } from './components/Message.vue'
export type {
  MessageOpenChangeDetails,
  MessageProps,
  MessageVariant,
} from './components/Message.vue'
export { default as Field, fieldKey } from './components/Field.vue'
export type { FieldContext } from './components/Field.vue'
export { default as Input } from './components/Input.vue'
export { default as Textarea } from './components/Textarea.vue'
export { default as InputNumber } from './components/InputNumber.vue'
export { default as OtpInput } from './components/OtpInput.vue'
export { default as Checkbox } from './components/Checkbox.vue'
export { default as Switch } from './components/Switch.vue'
export { default as RadioGroup } from './components/RadioGroup.vue'
export type { RadioGroupContext } from './components/RadioGroup.vue'
export { default as Radio } from './components/Radio.vue'
export { default as SelectButton } from './components/SelectButton.vue'
export type { SelectButtonItem } from './components/SelectButton.vue'
export { default as Knob } from './components/Knob.vue'
export { default as Dial } from './components/Dial.vue'
export { default as Chip } from './components/Chip.vue'
export { default as Select } from './components/Select.vue'
export type {
  SelectItemData,
  SelectSide,
  SelectAlign,
  SelectVirtualizeConfig,
} from './components/Select.vue'
export { default as Combobox } from './components/Combobox.vue'
export type { ComboboxAlign, ComboboxFilter, ComboboxSide } from './components/Combobox.vue'
export { default as Slider } from './components/Slider.vue'
export { default as FileUpload } from './components/FileUpload.vue'
export type { FileRejectReason } from './components/FileUpload.vue'
export { default as Pagination } from './components/Pagination.vue'
export { default as Resizable } from './components/Resizable.vue'
export { default as DataTable } from './components/DataTable.vue'
export { default as Column } from './components/Column.vue'
// <Column>'s #cell/#header slot can call this directly to reach
// selected/toggleSelect/isSelected — see DataTableDemo.vue.
export { provideDataTableContext, useDataTableContext } from './composables/useDataTableContext'
export type { DataTableContext, RegisteredColumn } from './composables/useDataTableContext'
export { default as Dialog } from './components/Dialog.vue'
export type { DialogPosition, DialogProps, DialogSize } from './components/Dialog.vue'
export { default as DialogHost } from './components/DialogHost.vue'
export { default as BottomSheet } from './components/BottomSheet.vue'
export type { BottomSheetProps, SheetSnapPoint } from './components/BottomSheet.vue'
export { default as Tabs } from './components/Tabs.vue'
export { default as Toolbar } from './components/Toolbar.vue'
export { default as Accordion } from './components/Accordion.vue'
export { default as AccordionItem } from './components/AccordionItem.vue'
export { default as Collapsible } from './components/Collapsible.vue'
export { default as Popover } from './components/Popover.vue'
export type { PopoverAlign, PopoverProps, PopoverSide } from './components/Popover.vue'
export { default as Menu } from './components/Menu.vue'
export type {
  MenuAlign,
  MenuEntry,
  MenuItemData,
  MenuProps,
  MenuSeparator,
  MenuSide,
} from './components/Menu.vue'
export { default as MenuList } from './components/MenuList.vue'
export type { MenuListProps } from './components/MenuList.vue'
export { default as ContextMenu } from './components/ContextMenu.vue'
export type {
  ContextMenuAlign,
  ContextMenuProps,
  ContextMenuSide,
} from './components/ContextMenu.vue'
export { default as Tooltip } from './components/Tooltip.vue'
export type { TooltipAlign, TooltipProps, TooltipSide } from './components/Tooltip.vue'
export { default as CascadeSelect } from './components/CascadeSelect.vue'
export type { CascadeSelectItem, CascadeSelectPath } from './components/CascadeSelect.vue'
export { default as Tree } from './components/Tree.vue'
export type { TreeNode, TreeSelectionMode } from './components/Tree.vue'
export { default as TreeSelect } from './components/TreeSelect.vue'
export type {
  TreeSelectAlign,
  TreeSelectNode,
  TreeSelectSelectionMode,
  TreeSelectSide,
} from './components/TreeSelect.vue'
export { default as TooltipHost } from './components/TooltipHost.vue'
export type { TooltipHostProps } from './components/TooltipHost.vue'
export { default as ConfigProvider } from './components/ConfigProvider.vue'
export { default as Toaster } from './components/Toaster.vue'
export type { ToasterPosition } from './components/Toaster.vue'
export { generateThemeCss, useThemedUi, themeKey, themeScopeKey } from './theme'
export type { UiTheme } from './theme'

export { useDialog } from './composables/useDialog'
export type {
  DialogCloseReason,
  DialogOpenChangeDetails,
  UseDialogOptions,
} from './composables/useDialog'
export {
  dialogRefKey,
  openDialog,
  useDialogQueue,
  useDialogRef,
} from './composables/useDialogService'
export type {
  DialogRef,
  DynamicDialogEntry,
  OpenDialogHandle,
  OpenDialogOptions,
} from './composables/useDialogService'
export { useNumberFormat } from './composables/useNumberFormat'
export type { UseNumberFormatOptions, UseNumberFormatReturn } from './composables/useNumberFormat'
export { useTabs } from './composables/useTabs'
export { useFieldControl } from './composables/useFieldControl'
export type { UseFieldControlOptions, UseFieldControlReturn } from './composables/useFieldControl'
export type { UseTabsOptions, UseTabsReturn } from './composables/useTabs'
export { useToolbar } from './composables/useToolbar'
export type { UseToolbarOptions, UseToolbarReturn } from './composables/useToolbar'
export { useCollapse } from './composables/useCollapse'
export type {
  CollapseState,
  UseCollapseOptions,
  UseCollapseReturn,
} from './composables/useCollapse'
export { useSheetDrag } from './composables/useSheetDrag'
export type { UseSheetDragOptions, UseSheetDragReturn } from './composables/useSheetDrag'
export { useTabIndicator } from './composables/useTabIndicator'
export type { UseTabIndicatorOptions, UseTabIndicatorReturn } from './composables/useTabIndicator'
export { usePopover } from './composables/usePopover'
export type {
  PopoverCloseReason,
  PopoverOpenChangeDetails,
  UsePopoverOptions,
} from './composables/usePopover'
export { useMenu } from './composables/useMenu'
export type { UseMenuOptions, UseMenuReturn } from './composables/useMenu'
export {
  KNOB_SWEEP_DEG,
  KNOB_SWEEP_END_DEG,
  KNOB_SWEEP_START_DEG,
  useKnob,
} from './composables/useKnob'
export type { UseKnobOptions, UseKnobReturn } from './composables/useKnob'
export { DIAL_DEFAULT_DEGREES_PER_STEP, useDial } from './composables/useDial'
export type { UseDialOptions, UseDialReturn } from './composables/useDial'
export { useVirtualizer } from './composables/useVirtualizer'
export type {
  ScrollAlign,
  UseVirtualizerOptions,
  UseVirtualizerReturn,
  VirtualRow,
} from './composables/useVirtualizer'
export { useListbox } from './composables/useListbox'
export type { UseListboxOptions, UseListboxReturn } from './composables/useListbox'
export { useSlider } from './composables/useSlider'
export type { SliderOrientation, UseSliderOptions, UseSliderReturn } from './composables/useSlider'
export { useResizable } from './composables/useResizable'
export type {
  ResizeDirection,
  ResizeEdge,
  UseResizableOptions,
  UseResizableReturn,
} from './composables/useResizable'
export { useFileDrop } from './composables/useFileDrop'
export type { UseFileDropOptions, UseFileDropReturn } from './composables/useFileDrop'
export { useTooltip, useTooltipCore } from './composables/useTooltip'
export type {
  TooltipCloseReason,
  TooltipOpenChangeDetails,
  UseTooltipOptions,
} from './composables/useTooltip'
export { useFloatingPosition } from './composables/useFloatingPosition'
export type { Align, UseFloatingPositionOptions } from './composables/useFloatingPosition'
export { useAsyncLoading } from './composables/useAsyncLoading'
export type { UseAsyncLoadingReturn } from './composables/useAsyncLoading'
export { useColorScheme } from './composables/useColorScheme'
export type {
  ColorSchemeMode,
  UseColorSchemeOptions,
  UseColorSchemeReturn,
} from './composables/useColorScheme'
export { toast, useToastQueue } from './composables/useToast'
export type { ToastEntry, ToastFn, ToastOptions, ToastVariant } from './composables/useToast'
export { useLayer } from './composables/useLayerStack'
export type { Layer } from './composables/useLayerStack'

export {
  defaultMessages,
  mergeMessages,
  messagesKey,
  resolveMessagesFromI18n,
  useUiMessages,
} from './messages'
export type { I18nInstance, PartialUiMessages, UiMessages } from './messages'
export { classMergerKey, useClassMerge, resolveUiPart, splitUiPart } from './classes'
export type { ClassMerger, ClassValue, UiPartValue, UiPartStyle } from './classes'
export { vScrollMask, vScrollMaskVapor } from './directives/vScrollMask'
export { vTooltip, vTooltipVapor, tooltipTargets, TOOLTIP_ATTR } from './directives/vTooltip'
export type { TooltipDirectiveOptions, TooltipDirectiveValue } from './directives/vTooltip'
export { focusIsFromKeyboard } from './composables/useFocusVisible'

// Lets Volar/vue-tsc resolve `v-tooltip`/`v-scroll-mask` in templates when
// registered globally
declare module 'vue' {
  interface GlobalDirectives {
    vTooltip: typeof import('./directives/vTooltip').vTooltip
    vScrollMask: typeof import('./directives/vScrollMask').vScrollMask
  }
}

export { default as PullToRefresh } from './components/PullToRefresh.vue'
export type { PullToRefreshProps } from './components/PullToRefresh.vue'
export { usePullToRefresh } from './composables/usePullToRefresh'
export type {
  PullToRefreshState,
  UsePullToRefreshOptions,
  UsePullToRefreshReturn,
} from './composables/usePullToRefresh'

export { default as Dock } from './components/Dock.vue'
export type { DockItemData } from './components/Dock.vue'
export { dockFalloff, dockItemSize, dockItemSizes, useDock } from './composables/useDock'
export type {
  DockFalloffOptions,
  DockOrientation,
  UseDockOptions,
  UseDockReturn,
} from './composables/useDock'

export { default as Calendar } from './components/Calendar.vue'
export type {
  CalendarDisabledDates,
  CalendarRange,
  CalendarSelectionMode,
  CalendarView,
} from './components/Calendar.vue'
export { default as DatePicker } from './components/DatePicker.vue'
export type { DatePickerAlign, DatePickerSide } from './components/DatePicker.vue'

export { default as SpeedDial, quarterCirclePoint } from './components/SpeedDial.vue'
export type {
  SpeedDialDirection,
  SpeedDialItem,
  SpeedDialProps,
  SpeedDialTriggerMode,
} from './components/SpeedDial.vue'

export { default as SwipeToReveal } from './components/SwipeToReveal.vue'
export { useSwipeReveal, resolveSwipeCommit } from './composables/useSwipeReveal'
export type {
  SwipeRevealSide,
  SwipeCommitInput,
  UseSwipeRevealOptions,
  UseSwipeRevealReturn,
} from './composables/useSwipeReveal'
