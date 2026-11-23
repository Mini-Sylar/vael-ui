---
'vael-ui': patch
---

## Fixes

- **useDrag:** a release that moves only one axis, or keeps one where it is, no longer reports `onRest` before the other axis has landed. Before, a window clamped back onto the screen could fly off it. An axis `onRelease` keeps where it was let go stays put instead of coasting past and coming back.
- **Dock:** removing an item no longer leaves its slot behind. The item that took its place was pushed sideways when hovered, and `itemEls()` listed it twice.
- **Card:** a card with `as="button"` now uses the page's font and starts its text at the start edge. Before, it took the browser's button font, padding and centered text.
