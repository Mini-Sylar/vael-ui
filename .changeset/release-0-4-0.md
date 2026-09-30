---
'vael-ui': minor
---

## Behaviour changes

Worth a look before upgrading from 0.3.x:

- **Select / Combobox / TreeSelect:** `maxPanelHeight` now defaults to 320, so long lists scroll inside a shorter panel. Pass `Infinity` for the old full-height panel.
- **DatePicker:** opens on click, ArrowDown, Enter or Space, no longer on focus.
- **Menu / SplitButton / Popover / Tour / TreeSelect / CascadeSelect / DatePicker / Select:** closing now returns focus to what opened it. Tab from an open Menu or Popover closes it and moves on from the trigger.
- **PasswordInput:** attributes you pass are no longer dropped. `class` and `style` go on the wrapper; everything else (`id`, `name`, `data-*`, `aria-*`) goes on the input.
- **Collapsible / Accordion:** with `motionCss: false`, no inline `block-size` or `visibility` is written, so your own animation owns the panel's height. Closed panels are now `inert`.
- **ConfigProvider:** always renders its `display: contents` wrapper, whether or not a theme is set.

## Types and editor support

- **All components:** every prop, `v-model`, event, slot and exposed member now has a short description, shown in your editor's hover.
- **All components:** props and models with a default now carry an `@default` tag, so the hover shows the default value.
- **Accordion / ButtonGroup / ConfigProvider / Kbd / RadioGroup / Skeleton / Toolbar / TooltipHost:** slots are now typed, so `#default` and friends autocomplete and type-check.

## New

- **Dock:** `grow` makes magnified items change real size, so the dock grows with them. The default is still the transform-based magnification. Items now shrink to fit a narrow container instead of overflowing it.
- **DataTable:** `selectionMode="row"` works from the keyboard. Rows are one Tab stop; Arrow keys, Home and End move between them, Space or Enter toggles, and Shift+Arrow extends a multiple selection. Rows get `aria-selected`, and the expand button gets `aria-expanded` and `aria-controls`.
- **Stepper:** new `#indicator` slot for custom content inside each step's circle.
- **Tabs:** `idBase` wires tabs to your panels with `aria-controls`. The slot and exposed `panelProps(value)` give each panel its `id`, `role="tabpanel"` and `aria-labelledby`.
- **Menu:** `openPath` opens the submenus along a path and focuses its last item. CascadeSelect uses it to reopen on the selected value.
- **Tokens:** `--ui-danger-solid` (and `-hover`) for solid danger fills such as buttons and badges, and `--ui-ease-pop` for a slight overshoot on things arriving.

## Fixes

- **ContextMenu:** opens at the pointer inside a transformed or filtered ancestor (a leftover `transform` from a page-transition animation counts). It used to open offset by that ancestor's position, sometimes off the edge of the screen.
- **Rating / Slider / Knob / Dial:** clicking no longer shows the keyboard focus ring. It still shows for keyboard focus, and once you use the arrow keys after a click.
- **FileUpload:** the first file you add now fades in like the rest, and a removed file now collapses smoothly while it fades, instead of fading first and then snapping the rows below into place. With `motionCss: false`, `@item-enter` and `@item-leave` now also fire for the first and last file.
- **Knob / Dial:** the value arc now draws as one stroke up to the pointer. It was split into pieces that didn't match the value.
- **OtpInput:** pasting a formatted code like `123-456` keeps every digit. Clicking a filled cell selects it, so typing replaces that digit and Backspace clears it.
- **InputNumber:** Enter now clamps to `min`/`max`, like leaving the field does.
- **FileUpload:** the hidden file input is no longer its own invisible Tab stop. Removing a row with the keyboard moves focus to the next row instead of losing it. A custom `#item` slot now fills the row's width.
- **Menu / SplitButton / Popover / Tour / TreeSelect / CascadeSelect / DatePicker / Select:** closing with Escape, picking an item or finishing a tour now returns focus to what opened it, instead of dropping it on the page. Submenus return focus to their parent item.
- **Menu / Popover:** Tab from the trigger moves into an open popover's content. Tab past either end closes it and carries on from the trigger, instead of losing focus at the end of the page. Popover's trigger now gets `aria-expanded` and `aria-controls`.
- **Stacked overlays:** one Escape now closes only the top layer. A Drawer opened from a Menu no longer takes the Menu with it.
- **Dialog / Drawer / BottomSheet:** the close and maximize buttons show the library's focus ring instead of the browser default.
- **Popover:** no longer runs off the edge of narrow screens.
- **DatePicker:** opens on click, ArrowDown, Enter or Space, no longer on focus, so tabbing through a form doesn't pop it open.
- **Calendar:** the year grid always includes the current year, and focus stays on the header when you drill up to it.
- **Combobox:** clicking the input reopens the list after a pick or Escape.
- **Select / TreeSelect / CascadeSelect:** inside a Field, the trigger is now named by the Field's label.
- **Collapsible / Accordion:** with `motionCss: false`, no inline height or visibility is written, so your own close animation plays instead of snapping shut. Closed panels are also `inert`, so their content can't be tabbed to.
- **TreeSelect:** child rows are indented again.
- **SelectButton:** the keyboard focus ring is no longer clipped.
- **Sortable:** drag handles show a focus ring.
- **Breadcrumb:** separators no longer shrink away when space is tight.
- **Timeline:** tags and buttons inside an item keep their own width.
- **SwipeToReveal:** tabbing to a hidden action now reveals its edge, so the focused button is visible. Tabbing out of the row closes it again.
- **PasswordInput:** `class`, `style` and other attributes were dropped. `class` and `style` now go on the wrapper, and everything else (`id`, `name`, `data-*`, `aria-*`) goes on the input.
- **Toaster / Tour / TooltipHost:** attributes were dropped. They now go on the toast region, the tour panel and the tooltip panel.
- **Select / Combobox:** `ui.empty` now styles the "No results" row. It had no effect before.
- **ConfigProvider:** setting a theme for the first time, or clearing it, no longer remounts everything inside. Focus and component state survive a theme switch.
- **Badge:** a changed count now slides in from the direction it moved, with a light blur and overshoot, instead of the whole badge twitching.
- **Tooltip / TooltipHost:** moving quickly between triggers no longer clips the tooltip. It sizes to each new label at once, and only shrinking animates.
- **Popover / Menu / Select / Combobox / Tooltip:** open and close scales are tuned. Panels open from 0.97, close to 0.99 so closing gets out of the way, and tooltips open from 0.98.
- **Calendar:** the month slide travels less and uses the library's ease-out.
- **AvatarGroup:** the hover lift settles back with a soft spring instead of snapping.
- **Button / Badge (dark):** danger fills are darker, so white text on them is readable. Enabled danger buttons reach 4.5:1.
- **Chip:** Delete and Backspace remove a focused removable chip. Focus moves to the next chip, or the previous one, instead of dropping to the page. The × focus ring fits inside the chip.
- **Rating:** `aria-valuenow` always reports the committed value, not the hover preview. Arrow keys show their change at once even with the pointer resting on the stars. Empty stars are more visible in dark mode.
- **Field:** the required asterisk is no longer part of the label's text.
- **Slider:** the unfilled track is visible in dark mode.
- **Message:** the status icon is centred on the title line.
- **SpeedDial:** arrow keys follow `direction`. After a hover-open, the first click on the trigger no longer closes it.
- **Toaster:** the collapsed stack always peeks out behind the front toast, whatever the toasts' heights. Keyboard focus inside the stack expands it.
- **Select / Combobox / TreeSelect:** `maxPanelHeight` now defaults to 320, so a long list no longer fills the screen (`Infinity` restores the old behaviour). The `#footer` slot uses the panel's type size.
- **CascadeSelect:** reopening shows the selected path, expanded and focused.
- **Calendar / DatePicker:** Prev and Next are disabled when the next page is entirely outside `min`/`max`. Switching between day, month and year views no longer changes the calendar's size.
- **DatePicker:** the time field moves to minutes once the hour is complete, so typing `1830` gives 18:30. Enter in a time field commits and closes.
- **Menu:** ArrowDown or ArrowUp on the trigger opens the menu on the first or last item.
- **Dialog:** clicking the backdrop of a dialog that can't be dismissed keeps focus inside it.
- **Pagination:** the list holds only `<li>` elements.
- **Stepper:** in linear mode you can click back to any step you've reached. Disabled steps are dimmed and use `aria-disabled`.
- **Accordion:** ArrowUp/ArrowDown, Home and End move between triggers. The trigger text lines up with the panel text. With `motionCss: false`, the panel no longer fights your own height tween.
- **ScrollArea:** `autoHide` now hides the scrollbar in Chrome and Firefox too.
- **Rating:** no longer stretches to full width inside a Field, so its focus ring hugs the stars.

## Dependencies

- Bumped `vue` (and all `@vue/*` packages) to `3.6.0-rc.10` across the workspace. The Vapor build is compiled against it, so pin `vue@3.6.0-rc.10` when you use `vael-ui/vapor`.
- **Combobox (Vapor interop):** with `vue@3.6.0-rc.10`, the input no longer goes blank after a pick when Combobox sits inside a regular Vue component under `vaporInteropPlugin` (upstream fix, [vuejs/core#15670](https://github.com/vuejs/core/issues/15670)).
