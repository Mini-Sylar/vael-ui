---
'vael-ui': patch
---

## Fixes

- **Button / Toolbar / Tag / Badge:** reverted `text-box-trim`'s under-edge back to `cap alphabetic` — 0.3.6's `cap text` traded away optical centering (labels sit visibly high without it) to avoid descender clipping in truncated labels, which is the rarer case and already has a documented per-instance override (`:ui="{ label: { style: 'text-box: initial' } }"`).
- **ScrollArea:** its scroll viewport now sets `overscroll-behavior: contain`, so scrolling inside a `ScrollArea` nested in another scrollable ancestor can no longer chain out to that ancestor once it hits either end — fixes upward scroll inside a nested `ScrollArea` instead scrolling the outer page.
- **PullToRefresh:** `usePullToRefresh` no longer arms a pull the instant `scrollTop` reads `0` — it now also checks that the scroll box has actually settled (via `useScroll`'s `isScrolling`), not mid a native momentum/rubber-band bounce-back through `0` on the way back from an overshoot. A touchstart landing in that window used to arm a pull-to-refresh gesture even though the user was still scrolling, not at rest at the top.
- **Popover:** new opt-in `openOnTriggerClick` prop gives `Popover` the same fully-managed `#trigger` contract `Menu` already has — click-to-toggle and auto-resolved trigger positioning, no manual `setTriggerEl`/`open` wiring needed. Default stays `false`, so existing manually-driven usage is unaffected.

## Also fixed

- `ScrollArea`, `Menu`, `Popover`: replaced hand-rolled `ResizeObserver`/`MutationObserver` wiring with VueUse's `useResizeObserver`/`useMutationObserver` (already a dependency) — same behavior, less bespoke lifecycle code to maintain. `ScrollArea` also now derives its `atTop`/`atBottom`/`atStart`/`atEnd`/`scrollTop`/`scrollLeft` state from `useScroll` instead of a manual `@scroll` handler, and newly exposes `isScrolling` and `directions`.
- `useVirtualizer`: its scroll listener now tracks `containerEl` reactively via `useEventListener` instead of a plain `addEventListener` bound once at mount — a container ref swapped after mount used to leave the old element's listener attached while `onScopeDispose` tried (and failed) to remove it from the new one. Dormant with today's built-in callers (Select/Combobox/DataTable panels all bind a static container), but a real hazard for any external consumer of this exported composable with a swappable container ref.
- `Textarea`: `autoGrow`'s fallback resize handling (the JS path used only where CSS `field-sizing: content` isn't supported) is now wired via `useEventListener`/`useResizeObserver` reacting to the live `autoGrow` prop, instead of being set up once from a snapshot read at mount — `autoGrow` flipping `false → true` after mount now actually takes effect.
