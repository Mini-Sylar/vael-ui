# vael-ui

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
