---
'vael-ui': minor
---

## Draggable & sortable

**New: `Sortable`**, a spring-driven drag-to-reorder primitive — pointer and keyboard drive the
same grabbed state, with `canDrop`/`beforeDrop` gates (the latter composes with `confirmAction()`
for a confirm-before-move dialog) and a `drop-error` event for a rejected/thrown `beforeDrop`.

**New: `Tree` is reorderable.** `reorderable` drags rows VS Code style — drop on a row's middle to
move it into that folder, on an edge to place it alongside — with a `reorderSiblings` option to
lock sibling order while still allowing re-parenting.

**New: `DataTable` column reorder**, driven by the same engine, and now with `canDrop`, `beforeDrop`,
and `previewMode` (see below) — previously the only reorder feature in the library with no
drop-gating hooks at all.

**New: `v-draggable`**, a container-level directive for "make this list draggable" without reaching
for the full `Sortable` component — sorts a plain array by position, same engine underneath.

**New: `useSortableGroup`**, the cross-container drag primitive a Kanban-style board is built from —
lets an item cross from one `Sortable`/`useSortable()`/`v-draggable` list into another. Exposes
`isForeignDropTarget` (and a `[data-drop-target]` attribute on `Sortable`'s root) so a destination
list can show a "drop here" hint while a sibling's drag hovers it.

**New: single-instance drag previews.** `useSortable`/`Sortable` gain a `previewMode` option
(`'element' | 'clone'`). `'element'` moves the real dragged item itself, so there's only ever one
instance of it on screen — dragging across containers no longer shows both the original item and a
separate floating copy at once. `'clone'` keeps the floating-copy behavior for elements that can't
leave their normal layout (a `<tr>`, a `<th>`), and stays the default for `Tree` and `DataTable`.

**New: dragging a folder or group carries its children with it.** `previewCarriesSubtree` (on by
default) makes a dragged row with visible descendants — an expanded `Tree` folder, a grouped tab —
carry real copies of them along at the exact offset they already sat at, instead of leaving its
children stranded in place while only the row itself moves.

**New: `nestEdgeFraction`.** Configurable width for the "drop beside vs. drop inside" hit zone on a
nested drop target (previously a fixed 25%) — shrink it for a small or reflowing target that's hard
to land on precisely.

**Fixed:** the shared reorder engine's drop hand-off and identity tracking, and `reorderSiblings:
false` being ignored when dropping past a list's last row.

**Fixed:** a cross-container drag stayed locked to its origin list's sort axis until it actually
crossed into a sibling list, reading as stuck; it now tracks the pointer freely from the moment it
lifts. The box shadow on a grabbed/dragging `Sortable` item was also toned down.

## New components

- **`Rating`** — star (or custom icon) rating input, with per-icon elements exposed for external
  animation.
- **`Timeline`** — vertical event timeline.

## New customization APIs

- **`Select`/`Combobox`/`Menu`/`TreeSelect`** gain `filter` (Select/Combobox), `header`, and
  `footer` slots for custom panel chrome.
- **`Tabs`** exposes its tab/indicator wiring (`itemProps`, `indicatorProps`) as bindable slot
  props, for a fully custom tab/indicator markup.
- **`DatePicker`** gains `showTime`/`timeOnly` (a time picker alongside or instead of the calendar,
  vael-ui's own implementation, not PrimeVue's) and a built-in Today/Clear button bar
  (`showButtonBar`, or override entirely with `#footer`).
- **`Select`/`Combobox`/`Menu`/`TreeSelect`** gain `maxPanelHeight`, capping the panel's height even
  when the viewport has room for more.
- **`Pagination`**'s active page now gets a sliding indicator instead of a hard swap, matching
  `MenuList`'s own active-item indicator.

## Fixes

- **Keyboard/focus:** `Knob`, `Dial`, and `Slider` no longer lose keyboard focus after a pointer
  drag.
- **Motion:** reduced-motion no longer drops opacity fades, only movement; the active-row highlight
  no longer animates on keyboard navigation; a re-grabbed, still-settling `BottomSheet`/`Drawer` no
  longer snaps to a stale target; `Timeline`'s reduced-motion active-dot reset now actually matches;
  `Calendar`'s month crossfade is masked with a subtle blur and now animates its body height, with
  press feedback on its nav buttons; layout-property transitions (floating label, DatePicker's
  panel) are now contained to their own box instead of leaking to an ancestor.
  Press-feedback consistency pass: two over-aggressive presses toned down, eight missing ones added.
- **`DataTable`:** the page number no longer goes stale when a search/sort shrinks the total; rows
  returning from a search no longer pop in at full opacity, overlapping their neighbors.
  `scrollToIndex` now accounts for the scroll container's own padding.
- **`Select`:** no longer shows a no-op filter box by default.
- **`Combobox`:** a row's `mousedown` no longer races its blur-revert into closing the panel
  unexpectedly.
- **`Switch`:** the thumb no longer sits asymmetrically off-center with an undefined top edge.
- **`Popover`:** an internal list can no longer be scrolled past its own bound into scrolling the
  page behind it.
- **`Textarea`:** the resize handle no longer sits flush against the field's corner.
- **`Card`:** no longer renders nothing when used with only a description, no title.
- **`TimeField`/`DatePicker`:** steppers and the AM/PM toggle are larger on coarse (touch) pointers.
- **`DatePicker`:** `timeOnly` combined with a range selection no longer leaves the panel empty; the
  Today button moved to the footer's far left.
- **`v-draggable`:** survives unrelated re-renders and correctly suppresses the trailing click a
  drag also triggers.

Also includes inline documentation (JSDoc) fixes across many components' props, events, and slots
that were previously undocumented or inaccurate.
