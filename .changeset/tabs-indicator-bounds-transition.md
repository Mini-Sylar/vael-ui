---
'vael-ui': patch
---

`useTabIndicator`'s `sizing` option now defaults to `'bounds'` instead of `'transform'`. The old default scaled a 1px CSS baseline via `transform: scale()`, which flattened border-radius on the scaled axis and could round unevenly on fractional-device-pixel-ratio displays (common on Windows), producing a visibly misaligned indicator. `'bounds'` sets the indicator's real `insetInlineStart`/`inlineSize` in px instead, avoiding both issues; `'transform'` remains available as an explicit opt-in for indicators with no rounded corners on the scaled axis. `.ui-tabs-indicator`'s CSS now also transitions `inset-inline-start`/`inline-size`/`inset-block-start`/`block-size` so `'bounds'` mode animates smoothly instead of jumping.
