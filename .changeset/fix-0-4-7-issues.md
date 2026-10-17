---
'vael-ui': patch
---

## Features

- **openDialog:** the backdrop is exposed as `overlayEl`, on the returned handle and on `useDialogRef()`, like `<Dialog>`'s own `overlayEl`.
- **openDialog, openPopover:** new `onOpenChange` option, the same as `@open-change` on `<Dialog>` and `<Popover>`.
- **Stepper:** new `labelEls`, so a custom animation can change each label's color along with its step.
- **New `vael-ui/layers.css`:** for Tailwind v4. Import it before Tailwind to set the layer order without loading CSS for every component, as `vael-ui/style.css` did.
- **Button:** a ghost, outline or secondary button with `aria-pressed="true"` now looks pressed, so toggles in a Toolbar or ButtonGroup show when they're on. In a ButtonGroup the pressed button's border sits above its neighbours. No new prop.
- **CascadeSelect:** new `multiple` prop. Pick several leaves across branches; the menu stays open on the same path. The field shows them like Select, with `display` (`chip`, `text` or `count`), `maxLabels` and removable chips, and `clearable` empties them all.
- **Menu:** an item with `checked: true` or `false` becomes a checkbox row (`role="menuitemcheckbox"`) with a check mark, for toggles like "Show grid". Pair it with `keepOpen`.
- **Accordion:** new `headingLevel` prop (default 3) sets the header level; an AccordionItem can override it.
- **ConfigProvider:** new `locale` prop sets the language for dates, numbers and the week start of every component inside, without vue-i18n. It wins over `i18n`'s locale. Set it when you render on a server.
- **New messages:** `pagination.pageSize` ("Rows per page"), `dataTable.loading` ("Loading…"), `slider.minimum` ("Minimum"), `slider.maximum` ("Maximum") and `cascadeSelect.selectedCount` ("{count} selected") and `commandPalette.label` ("Command palette"). If you translate vael-ui's messages, add these.

## Smaller and faster

- **DataTable, Tree:** the drag-to-reorder code loads only when `reorderableColumns` or `reorderable` is on. A DataTable now ships about 16.8 KB gzipped instead of 22 KB, and tables and trees that don't reorder no longer listen to every pointer move on the page. A drag or keyboard grab that starts while the code is still loading is held and runs as soon as it arrives.
- **Vapor:** the Vapor build uses the regular build's composables and CSS instead of its own copies. Each Vapor build is about half the size, and an app that mixes both builds loads each file once.
- **Dependencies:** `@vueuse/core` 12 to 15 are all accepted, so an app already on VueUse 12, 13 or 14 doesn't get a second copy.
- **DataTable:** sorting 1,000 rows takes about 26ms instead of 500ms: row animation turns off above 150 rows. Select-all on 3,000 rows takes 240ms instead of 3.4s, and resizing a column no longer re-renders every cell on each move. Virtualized tables no longer re-render while you scroll within the same rows.
- **Tree:** selecting, checking or collapsing a node re-renders only the rows that changed. In a 2,000-row tree, selecting takes about 10ms instead of 280ms and collapsing a folder about 7ms instead of 700ms.
- **Menu, CascadeSelect:** menus with more than 100 items render only the visible rows; 1,000 items open in about 18ms instead of 200ms. Submenus mount the first time they open.
- **Fewer page-wide listeners:** Slider, Knob, Dial, Resizable, SwipeToReveal, DataTable and the drag engine listen to window pointer events only during a drag, and the drag engine no longer slows touch scrolling. Tabs no longer listens to every transition on the page.
- **Vapor build:** Chip's stylesheet is shared with the classic build instead of shipped twice.
- **Button:** the hidden loading spinner every Button keeps for its crossfade only turns while the button is loading. Before, each Button on the page ran an endless animation nobody could see.

## Fixes

- **Vapor:** importing from `vael-ui/vapor` works without the `vapor` resolve condition. Before, `toast()`, `openDialog()`, `openPopover()` and `confirmAction()` showed nothing, and a custom control couldn't read `<Field>`'s context.
- **Server rendering:** `toast()`, `openDialog()`, `openPopover()` and `confirmAction()` called while a page renders on a server no longer show up in other visitors' pages, and no longer pile up on the server. They run in the browser instead.
- **Server rendering:** rendering Select, Combobox, CascadeSelect, SplitButton, Breadcrumb, PullToRefresh or Tour on a server no longer keeps each render in memory for good. This works around a Vue 3.6 issue.
- **Server rendering:** a SpeedDial, Tour, Dialog, Popover or Tooltip that starts open no longer throws "document is not defined".
- **Calendar, DatePicker:** weeks start on the right day for the locale again in Chrome, which dropped the API vael-ui read. US English showed Monday first; it shows Sunday first again.
- **Calendar, DatePicker:** after server rendering, today's date is highlighted from the visitor's clock, not the server's.
- **Vapor:** Toaster, FileUpload and Timeline find their own element again. Focus returns to the right place after you dismiss toasts or remove a file with the keyboard, a wide Timeline can be scrolled with the keyboard, and their exposed elements are no longer `null`.
- **Vapor, v-scroll-mask:** the edge fade appears and goes away when the content inside grows or shrinks, as it did in classic components. Classic components also catch changes made inside a child component now.
- **DataTable:** `#cell` and `#header` slots written in a Vapor component render in apps that use `vaporInteropPlugin`, instead of "[object Text]".
- **DataTable:** a `<Column>` removed after the columns were reordered leaves the table.
- **Vapor:** the event that closes a Dialog, Menu, Popover, Tooltip, Select, Combobox, DatePicker, TreeSelect or Message (Escape, an option click, the close button) reaches your own `@keydown` or `@click` on it, as in classic components. Drawer, BottomSheet, ContextMenu, Tour and CommandPalette get this through them. This works around a Vue 3.6 issue.
- **Slots added or removed later:** Button's leading and trailing spacing, a Column's `#cell` and `#header`, Field's `#prepend` and `#append`, OtpInput's `#cell`, PasswordInput's `#hint`, Timeline's `#opposite`, DataTable's `#expansion` and a Menu's default slot update right away. Before, classic components kept the first answer until they re-rendered for another reason.
- **Collapsible:** a trigger slot that swaps in a different element gets `aria-expanded` and `aria-controls` too.
- **Select, Combobox, CascadeSelect:** the "+N" overflow chip keeps its muted color whatever order the stylesheets load in.
- **Timeline, Stepper, Pagination:** a `style` in a `ui` part (for example `:ui="{ opposite: { style: 'display: none' } }"`) now applies to that part. Only `root` used to take it; the others kept only the class.
- **Nuxt:** the dev server no longer reloads the page on the first visit.
- **ConfigProvider:** a `theme` no longer breaks server rendering. Its `<style>` used to replace the page's viewport `<meta>` or stylesheet `<link>` while the page hydrated, in Nuxt too.
- **confirmAction:** while an async `onConfirm` runs, Escape, outside clicks and Cancel no longer close it. Before, it reported a cancel while the action still ran.
- **Dialog, Drawer, Popover, Tooltip:** they now animate in when they're already open on their first render, such as `:open="true"` or inside a `v-if`. This also fixes dialogs opened with `openDialog()` and `confirmAction()`, where only the exit animated.
- **Select, Combobox, DatePicker, TreeSelect, Menu, SpeedDial:** they animate in when they're already open on their first render too.
- **Toaster:** a toast sent before its Toaster mounts, such as one fired while the app starts, now animates in.
- **Toaster:** a toast that arrives while you hover the stack, or while the tab is hidden, waits like the others instead of timing out.
- **Select, Combobox, DatePicker, TreeSelect:** `id`, `aria-*` and `data-*` go on the field you focus, not the popup, so an `aria-label` names the control.
- **Tooltip, v-tooltip:** they add their id to the trigger's `aria-describedby` instead of replacing it, so a field's error text is still read out after a hover.
- **v-tooltip:** new text, such as "Copy" changing to "Copied!", shows while the tooltip is open.
- **Tooltip, v-tooltip:** inside a Dialog, Escape closes the tooltip first and the Dialog on the next press.
- **Popover, Menu, Select, Tooltip:** changing `side`, `align` or an offset while open moves the panel.
- **Dialog:** closing a nested dialog that uses `closeOnHistoryBack` no longer closes the one behind it.
- **Dialog, Popover:** Escape that ends an IME composition, for example while typing Japanese, no longer closes them.
- **openDialog, openPopover:** closing one in the same tick you opened it no longer leaves it on screen with its `result` never settling.
- **Tour:** Skip and Done now run `beforeClose`, so your custom exit plays however the tour closes.
- **Tour:** arrow keys typed in a highlighted input move the caret instead of the tour, and Escape closes a Dialog you opened during a tour before it skips the tour.
- **Collapsible, Accordion:** they animate to the end when `--ui-duration-enter` is longer than 240ms, instead of snapping open.
- **Sortable, Tree, DataTable, v-draggable, SwipeToReveal:** releasing a drag or swipe away from where it started no longer swallows your next click or Enter.
- **DataTable, Tree:** removing one in the middle of a drag no longer leaves the drag preview on the page.
- **Stepper:** step labels fade to their new color with the circle, instead of switching instantly.
- **openDialog, openPopover, confirmAction:** one opened from a component that unmounts before it closes, such as during a route change, now closes and settles normally. Before, it stayed in the queue for good.
- **Toaster:** a toast queue for a `name` no Toaster uses anymore is freed once it's empty.
- **Toaster, Message:** dismissing one by keyboard moves focus to the next toast or the next control, instead of the page body.
- **Pagination:** the page-size select has an accessible name.
- **DataTable:** `loading` marks the table busy and is announced to screen readers.
- **Tree:** typing a letter moves to the next row that starts with it.
- **Dark mode colors:** success badges use dark text, info badges a deeper blue, and info text in Tag, Message and toasts is a touch lighter, so all of them meet WCAG AA contrast. Light mode is unchanged.
- **Touch targets:** Rating, the Chip remove button, the Select and Combobox clear buttons, the Combobox chevron, the PasswordInput toggle, InputNumber steppers and Tree's chevron and checkbox are easier to hit, with the same look.
- **Stepper, Timeline, Toaster, Sortable:** list markup is valid for screen readers.
- **Rating:** a Field's label points at it.
- **Slider, Knob, Dial, OtpInput:** an `aria-label` or `aria-labelledby` you pass names the control you focus, not its wrapper. A range Slider names its thumbs "Minimum" and "Maximum" after your label.
- **Combobox:** with `multiple` and no `maxLabels`, the chips wrap onto new lines inside the field instead of running past its edge.
- **Select:** pressing Enter or Space on a chip's remove button removes the chip instead of opening the list.
- **Switch, Checkbox, Radio:** an `id` or `aria-*` you pass now goes to the input, so `<label for>` and `aria-label` name the control. Class, style and `data-*` stay on the wrapper.
- **MenuList:** rows are plain links and buttons instead of `role="menuitem"`, since a navigation list isn't a menu. Arrow keys still move between them.
- **CascadeSelect:** the field, not a chip's remove button, carries the open state for screen readers.
- **DataTable:** the select and expand column headers have names, and with `scrollHeight` the header and body read as one table.
- **ScrollArea, PullToRefresh, Stepper, Timeline, DataTable:** a scrolling area with nothing focusable inside can be reached with Tab and scrolled with the keyboard.
- **FileUpload:** the file input has a name. **CommandPalette:** the dialog has a name. **Toaster:** an `aria-label` names its region, so two Toasters stay distinct.
- **Calendar:** content from the `#day` slot, such as a price, is read out with the date.
- **Dock:** a badge is read as "Mail, 3".
- **Chip, Select, Combobox, CascadeSelect, ButtonGroup:** remove and clear buttons and small group segments are at least 24px to click, with the same look.
