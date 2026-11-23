---
'vael-ui': patch
---

## More new features

- **useResizable:** takes a pair of sizes for one handle that drags both axes, such as a window's corner: `useResizable({ horizontal: width, vertical: height }, { horizontal: { min: 240 }, vertical: { min: 140 } })`. Each axis takes the options one size does, and `disabled`, `step` and `onCommit` at the top level apply to both. Name a handle by where it sits, `'n'`, `'se'` and so on, in `onHandlePointerdown` and `onHandleKeydown`: a side pulls one axis, a corner pulls both, and `'e'` and `'w'` stay the sides you see right to left. `onCommit` fires once per release. One size works as before.
- **Dialog:** a dialog with `modal` off comes to the front of the other open ones when you press or focus it, so several can sit side by side as windows. Escape closes the one in front.

## Fixes

- **Dialog:** the panel eases its size only while it maximizes or restores. A size you set from state, such as a window dragged to fit, follows the pointer at once instead of lagging behind it. A `v-model:maximized` flipped from your own button eases like the built-in one, and a panel placed with its own insets eases its place too.
- **Dialog, Accordion, Collapsible:** a maximize or a collapse now settles when its transition ends in Chrome, not on the fallback timer. Chrome reports the logical `inline-size` and `block-size` as `width` and `height`, which the checks missed.
