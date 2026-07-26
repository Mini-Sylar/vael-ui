# vael-ui

## 0.0.5

### Patch Changes

- [`1519048`](https://github.com/Mini-Sylar/vael-ui/commit/151904876e70eb80c554ee94135c3f5f04b3bf92) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Add `Drawer`, an edge-only companion to `Dialog` for side/top/bottom panels (navigation drawers, filter panels, and similar). It's a thin wrapper around the same `Dialog` engine (layer stack, focus trap, scroll lock, `forceMount`/`beforeClose` for custom motion) with a `side` prop restricted to `'left' | 'right' | 'top' | 'bottom'` — reach for `Dialog` directly for a centered panel, and `BottomSheet` when the bottom edge also needs to be drag-dismissible.

  Also:

  - Fix `SelectButton`'s sliding indicator staying parked on the last-selected option after `allowEmpty` deselects, instead of hiding.
  - Fix `Select`'s dropdown panel truncating option labels at small trigger sizes (it was pinned to the trigger's exact width instead of using it as a floor).
  - Add an `InputNumber` `stepperPosition="split"` variant (one button in `#start`, one in `#end`, alongside the existing `#end`-only default).
  - Fix `Toolbar` items that collapsed into the overflow menu before ever being measured while visible permanently failing to re-expand even once there was room.
  - Minify the built JS and CSS output (previously only the JS side was covered) and stop bundling `vue-component-type-helpers` as a runtime dependency, shrinking the published package.
  - Fix several server-side rendering crashes (`window`/`document is not defined`) for apps using SSR or static site generation: `OtpInput` disposed a `document` listener unconditionally on unmount, and `Dial`/`Knob`/`Slider`/`Resizable`/`SwipeToReveal`/`DataTable`'s column resize/`TooltipHost`/`Dock` all attached `window`/`document` listeners eagerly at setup instead of deferring to the client. Export the new `ssrWindow`/`ssrDocument` helpers (`undefined` on the server) for consumers writing their own SSR-safe listeners the same way.

## 0.0.4

### Patch Changes

- [`4383385`](https://github.com/Mini-Sylar/vael-ui/commit/438338579b0a61f089a7ebc125dff10513c50f28) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - `vael-ui/vapor` now ships all 57 public components (was 38) — `DialogHost`,
  `BottomSheet`, `CascadeSelect`, `Combobox`, `ContextMenu`, `DatePicker`,
  `FileUpload`, `InputNumber`, `MenuList`, `Message`, `Pagination`, `Radio`,
  `Select`, `SplitButton`, `Toaster`, `Toolbar`, `Tree`, `TreeSelect`, and
  `AccordionItem` were previously missing from the Vapor build entirely.

  Two real bugs surfaced and fixed along the way:

  - `useDialogQueue`/`DynamicDialogEntry` (needed by `DialogHost`) and
    `useNumberFormat` (needed by `InputNumber`) weren't exported from the
    main package, so the Vapor generator couldn't resolve them — both are
    now public.
  - The Vapor generator's import-rewriting only matched single-level `../`
    relative imports, silently leaving `internal/*.vue` components' (one
    directory deeper) `../../composables/...` imports unrewritten, which
    broke the build the moment one was included (`SelectListBody.vue`, used
    by `Select`/`Combobox`).

## 0.0.3

### Patch Changes

- [`0826c21`](https://github.com/Mini-Sylar/vael-ui/commit/0826c2146423a6d091821eaa8cef0f487d58c5aa) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Fix: `vTooltipVapor`/`vScrollMaskVapor` crashed with `TypeError: value is
not a function` on bare usage with no bound value (`<div v-scroll-mask>`,
  the primary documented pattern for that directive) — Vapor's compiler
  passes no `value` argument at all for a directive with no value
  expression, not a no-op getter. Both now guard with `value?.()`.

  Also: `app.directive('tooltip', vTooltip)` now type-checks cleanly on a
  Vapor app with no cast needed on the consumer's side — added a second,
  VDOM-shaped overload signature (never actually invoked at runtime, Vapor
  always calls the real one) purely so TypeScript accepts it. `vue` is now
  pinned to `3.6.0-rc.1` across the whole workspace (was mixed 3.5.x/3.6.x),
  which the overload fix also depended on.

## 0.0.2

### Patch Changes

- [`888efc8`](https://github.com/Mini-Sylar/vael-ui/commit/888efc8646c4df57b5f28ad6c6b008af05c0f29b) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Add `useColorScheme()` composable for dark/light/system mode (persistence,
  DOM attribute application, live OS-preference updates — no forced UI).

  Register `v-tooltip`/`v-scroll-mask` on Vue's `GlobalDirectives` interface
  so Volar/vue-tsc resolves them when registered globally
  (`app.directive('tooltip', vTooltip)`), not just via a local `<script
setup>` import.

  Document directive setup (including the global-registration requirement)
  and Vue Vapor support in the README.

- [`7287f70`](https://github.com/Mini-Sylar/vael-ui/commit/7287f70a265a119a37db100d3c0edbf463e67d09) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Fix: `vTooltip`/`vScrollMask` weren't exported from `vael-ui/vapor` at all —
  a Vapor-only app had no way to register them. Now exported under their
  plain names (`vTooltip`, `vScrollMask`, the Vapor-compiled functions),
  usable the same way as the main `vael-ui` entry: locally imported in
  `<script setup>`, or globally via `app.directive('tooltip', vTooltip)` on a
  `createVaporApp()` instance — verified global registration genuinely works
  for Vapor apps too (falls back to the same runtime directive resolution
  VDOM uses).
