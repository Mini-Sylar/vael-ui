---
'vael-ui': patch
---

## Fixes

- **BottomSheet:** closing no longer skips the slide-out animation when you pass your own `beforeClose` (e.g. a "discard changes?" confirm).
- **BottomSheet:** panel height now tracks the live viewport instead of a stale snapshot — fixes a gap opening up on mobile when the browser's address bar hides/shows mid-interaction.
- **BottomSheet:** added a `modal` prop (default `true`) and `ui.overlay`, so you can disable the scrim for an always-open, non-dismissible panel.
- **Dialog / Drawer / BottomSheet:** added an opt-in `closeOnHistoryBack` prop (default `false`) — the mobile hardware/gesture back action closes the panel instead of navigating the page away. Safe with nested dialogs and won't interfere with your app's own router history.
- **Combobox:** the input text now syncs correctly when `modelValue` is set from outside (e.g. loading a saved record) — it used to render blank until the user touched the field. Also fixed: opening with a preselected value no longer filters the list down to a single row.
- **SwipeToReveal:** a drag right after mount could be forced closed regardless of distance, on fast interactions or slower devices. Fixed.
- **Tooltip:** added long-press as a real touch trigger (500ms, matching Android/iOS convention). Tapping a button no longer accidentally opens its tooltip on touch, and a tooltip now closes properly instead of jumping to the top-left corner if its trigger is removed from the page (e.g. on a route change).
- **Menu:** fixed a rare first-open mispositioning bug where the trigger element could be resolved incorrectly and never recover.
- **PullToRefresh:** fixed a bug where reversing a pull gesture mid-touch (to scroll normally instead) could get stuck and stop scrolling from working for the rest of that touch.
- **FileUpload:** added a native `capture` prop (`boolean | 'user' | 'environment'`) to open the device camera directly on mobile.
- **Field / Textarea:** fixed the floating label drifting out of place as a resizable/auto-growing textarea changes height.
- **Textarea:** fixed auto-grow mode sometimes not filling the full width of its container.
- **Button / Toolbar / Tag / Badge:** fixed descenders (on letters like p, g, y, j, q) getting clipped in truncated labels.
- **Tree:** `theme.tree`'s `ui` type was missing `chevron` and `label`, so you couldn't theme them via `ConfigProvider` even though they worked when set directly on the component.

## Also fixed

- `useSwipeReveal` / `useSheetDrag`: guarded `setPointerCapture` against a rare exception that could cut a drag gesture short.
- Clarified `Popover`'s `#trigger` slot docs — unlike `Menu`, it doesn't wire click-to-open for you.
