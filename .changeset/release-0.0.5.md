---
'vael-ui': patch
---

Add `Drawer`, an edge-only companion to `Dialog` for side/top/bottom panels (navigation drawers, filter panels, and similar). It's a thin wrapper around the same `Dialog` engine (layer stack, focus trap, scroll lock, `forceMount`/`beforeClose` for custom motion) with a `side` prop restricted to `'left' | 'right' | 'top' | 'bottom'` — reach for `Dialog` directly for a centered panel, and `BottomSheet` when the bottom edge also needs to be drag-dismissible.

Also:

- Fix `SelectButton`'s sliding indicator staying parked on the last-selected option after `allowEmpty` deselects, instead of hiding.
- Fix `Select`'s dropdown panel truncating option labels at small trigger sizes (it was pinned to the trigger's exact width instead of using it as a floor).
- Add an `InputNumber` `stepperPosition="split"` variant (one button in `#start`, one in `#end`, alongside the existing `#end`-only default).
- Fix `Toolbar` items that collapsed into the overflow menu before ever being measured while visible permanently failing to re-expand even once there was room.
- Minify the built JS and CSS output (previously only the JS side was covered) and stop bundling `vue-component-type-helpers` as a runtime dependency, shrinking the published package.
- Fix several server-side rendering crashes (`window`/`document is not defined`) for apps using SSR or static site generation: `OtpInput` disposed a `document` listener unconditionally on unmount, and `Dial`/`Knob`/`Slider`/`Resizable`/`SwipeToReveal`/`DataTable`'s column resize/`TooltipHost`/`Dock` all attached `window`/`document` listeners eagerly at setup instead of deferring to the client. Export the new `ssrWindow`/`ssrDocument` helpers (`undefined` on the server) for consumers writing their own SSR-safe listeners the same way.
