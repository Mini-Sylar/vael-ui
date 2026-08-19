---
'vael-ui': patch
---

Fixes:

- `DataTable`: rows no longer jumble/clump near the top before dropping into their correct
  positions right after mount. Layout measurements DataTable takes right after mount (header
  height, frozen-column offsets) trigger a re-render that Vue's `TransitionGroup` couldn't tell
  apart from a real row reorder, so it played the row-move animation on rows that never actually
  moved — this only disables that one settling render, real sort/paging/expand reorders still
  animate as before.
- `Field`: the error message now visibly arrives (a small translate alongside the existing fade)
  instead of only fading in place, where an instant, unanimated layout shift (the flex gap/height
  snapping in) drowned out the fade and made it look like there was no animation at all.
