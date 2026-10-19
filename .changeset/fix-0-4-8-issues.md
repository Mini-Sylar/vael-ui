---
'vael-ui': patch
---

## Features

This release adds option groups, year jumps in the calendar, CascadeSelect search and toggle buttons, and smoother motion across the pickers.

- **Calendar, DatePicker**: `show-year-buttons` adds « and » beside the month arrows to jump a year at a time. It's off by default.
- **Select, Combobox**: put `{ label, items }` entries in `items` to group options under a label, like `<optgroup>`. Keyboard, search and screen readers follow the groups. Style them with `ui.group` and `ui.groupLabel`, or replace the label with the `#group-label` slot. `#item` also gets the option's `group`.
- **CommandPalette**: a `#group-label` slot for each heading, and `group` on `#item`.
- **CascadeSelect**: `filter` adds a search box that turns the levels into one list of matches, each with its path (`Africa / Ghana`). Also `filter-placeholder`, `v-model:query`, `ui.filter` and `path` on `#item`.
- **Menu, CascadeSelect**: each level's panel has `data-level`, so `[data-level='2']` styles the second menu.
- **Combobox**: set `revert-on-blur` to `false` to keep typed text when focus leaves, for search boxes.
- **ButtonGroup, Button**: give a ButtonGroup a `v-model` and each Button a `value` to make toggle buttons, with `aria-pressed` set for you. Use `multiple` for several at once, or `:allow-empty="false"` to keep one on.
- **Button**: `v-model:pressed` makes a single Button a toggle. `value` is also the native attribute, so it posts with a form.
- **Toolbar**: toggles in the overflow menu show their state as check rows.
- **Lists**: Select, Combobox, Tree, TreeSelect and CascadeSelect ease to their new height as you search, like CommandPalette.
- **Ticks**: the tick on a row you pick draws itself in, like Checkbox's. Select and Combobox now use the same SVG tick as Menu and Tree.
- **Messages**: `calendar.previousMonth`, `nextMonth`, `previousYear`, `nextYear`, `previousYears` and `nextYears` name the calendar's arrows. Add them if you translate vael-ui.

`motion-css="false"` turns off all the new motion, and reduced motion keeps only fades.

## Behaviour changes

- **Calendar, DatePicker**: with two months, a month you pick from the second month's header now shows second. It used to move to the first.

## Fixes

- **Tree, TreeSelect**: opening or closing a folder no longer draws rows over each other. The motion starts at once, reverses mid-way on a second click, and skips animation for arrow keys and search.
- **TreeSelect**: the panel grows and shrinks with the tree instead of jumping first.
- **Tree, TreeSelect**: search and `motion-css="false"` swap folders at once in the Vapor build too.
- **Select, Combobox, CascadeSelect**: a removed chip collapses in place, and chips removed together no longer overlap.
- **Select, Combobox, TreeSelect, CascadeSelect**: the clear button leaves without a jump. CascadeSelect's clear button now animates at all.
- **Select, Combobox, Tree, TreeSelect, CascadeSelect**: the selected row's tint is translucent, so it works on custom panel backgrounds.
- **Select, Combobox, Menu, CascadeSelect**: option lists no longer scroll sideways.
- **Menu, CascadeSelect**: `ui` styles every level, not only the first.
- **CommandPalette**: arrow keys follow the on-screen order when a group's items are spread through `items`.
- **Button**: a pressed toggle no longer looks the same as hover.
- **All components**: sizes match on pages without a box-sizing reset. Before, an Input with a width came out 26px wider and options 20px too wide.
- **Server rendering**: with the `vapor` condition, `import … from 'vael-ui'` loads the Vapor server build instead of failing.
- **Calendar, DatePicker**: the calendar stays inside narrow panels, the month name no longer wraps mid-change, arrows point outward right to left, and long two-month labels end in an ellipsis.
- **Package**: `npm fund` lists vael-ui's GitHub Sponsors page.
