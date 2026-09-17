---
'vael-ui': patch
---

## Fixes

- **Button / Toolbar / Tag / Badge:** reverted `text-box-trim`'s under-edge back to `cap alphabetic` — 0.3.6's `cap text` traded away optical centering (labels sit visibly high without it) to avoid descender clipping in truncated labels, which is the rarer case and already has a documented per-instance override (`:ui="{ label: { style: 'text-box: initial' } }"`).
- **ScrollArea:** its scroll viewport now sets `overscroll-behavior: contain`, so scrolling inside a `ScrollArea` nested in another scrollable ancestor can no longer chain out to that ancestor once it hits either end — fixes upward scroll inside a nested `ScrollArea` instead scrolling the outer page.
- **Popover:** new opt-in `openOnTriggerClick` prop gives `Popover` the same fully-managed `#trigger` contract `Menu` already has — click-to-toggle and auto-resolved trigger positioning, no manual `setTriggerEl`/`open` wiring needed. Default stays `false`, so existing manually-driven usage is unaffected.
