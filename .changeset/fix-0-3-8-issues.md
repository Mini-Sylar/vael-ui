---
'vael-ui': patch
---

## Fixes

- **Menu / Popover:** no longer anchor to the viewport corner when the trigger wrapper hasn't been laid out yet.
- **BottomSheet:** closing then quickly reopening no longer leaves the sheet in a stale state.
- **Avatar:** fallback color and initials no longer show through transparent images.
- **Select / CascadeSelect:** placeholder no longer overlaps the floating label.
- **Dialog / Drawer / BottomSheet:** stacked dialogs now layer by open order, not template order.
- **useVirtualizer:** `measureRow(index)` now returns a stable ref callback, so rows aren't re-measured on every render. DataTable's virtualized body uses it too.
- **Calendar:** new `#day` scoped slot (`{ date, isCurrentMonth, isToday, isSelected, isDisabled }`) for custom day content such as badges.
- **Tree:** collapse now shrinks with the fade instead of snapping shut, and uses the shorter exit duration. New `forceMount` prop lets a consumer drive the collapse animation themselves instead.
- **Field:** the floating label now also reacts to browser autofill, not just typed input.

## Known issues

- **CascadeSelect (Vapor):** nested submenu rows render as `[object Object]`. The VDOM build is not affected.
