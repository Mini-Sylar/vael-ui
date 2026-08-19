---
'vael-ui': patch
---

`Select` and `Combobox` gain a `motionCss` prop for their `multiple` chip list, matching the
animation-agnostic contract already used elsewhere (`DataTable`, `SpeedDial`, `FileUpload`, ...):
`false` skips the built-in chip enter/exit/reorder transition entirely, in favor of
`@chip-enter`/`@chip-leave` for a consumer-owned animation (GSAP, motion-v).

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
- `DataTable`, `SpeedDial`: `motionCss="false"` now actually disables reorder/reposition animation
  on a real sort/page change or action list change, not just enter/exit. Vue's `TransitionGroup`
  never gates its move (FLIP) animation on the `css` prop — only enter/leave are — so the built-in
  CSS transition kept firing regardless of `motionCss`, contradicting its own documented contract
  for anyone handing that animation off to GSAP/motion-v. Same root cause as the new `Select`/
  `Combobox` prop above.
