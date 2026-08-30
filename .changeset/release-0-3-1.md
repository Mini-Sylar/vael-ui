---
'vael-ui': patch
---

## Mobile drag-to-reorder

**Fixed: touch was unusable for `Tree` and `DataTable`'s column reorder** — any touch on a row/header
committed a drag immediately, so tapping to select/expand/sort competed with dragging, and once a
drag did start, it fought the browser's own scroll instead of taking over cleanly.

- **New: `touchDragDelay`** (`useSortable`, `Sortable`, `DataTable`, `v-draggable`) — ms a touch
  pointer must hold still before a drag starts; mouse/pen are unaffected and stay instant. Off (`0`)
  by default everywhere, since most drag handles have no competing tap action. `Tree` and
  `DataTable` default it to `150`, since a row/header there is also a tap target.
- Touch scrolling on a reorderable `Tree`/`DataTable` no longer fights the drag gesture: scrolling
  works normally until a hold commits, at which point the browser's native scroll hands off cleanly
  to the drag.

## Fixes

- **`Tree`:** `reorderSiblings: false` incorrectly blocked dragging a nested item back out to the top
  level when dropped past the last row — re-parenting out of a folder now works; reordering among
  already-top-level siblings still correctly stays locked.
- **`Sortable`:** holding a row past `beforeDrop`'s confirm-gate without moving it (a touch hold, or
  a very deliberate hover) no longer shows a confirm dialog for a drop that didn't actually change
  anything.
- **`Tree`:** removed the press-scale effect on rows — read as an unintentional wobble rather than
  feedback.
- **`v-draggable`**: the "plain list with a handle" pattern's grip icon is now a properly sized touch
  target (was ~8×19px).

## Docs

- `Sortable` now correctly shows the sidebar's "new" indicator.
